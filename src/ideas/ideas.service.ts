import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  lt,
  or,
  type SQL,
} from 'drizzle-orm';
import { db } from 'src';
import {
  categoriesTable,
  ideasTable,
  ideaStatusHistoryTable,
  usersTable,
} from 'src/db/schema';
import type { AuthUser } from 'src/types/express';
import { ClassificationService } from './classification.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { IdeaFeedbackDto } from './dto/idea-feedback.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import type { IdeasDigestItemDto } from './dto/ideas-digest.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { GeocodingService } from './geocoding.service';

@Injectable()
export class IdeasService {
  constructor(
    private readonly geocodingService: GeocodingService,
    private readonly classificationService: ClassificationService,
  ) {}

  async create(dto: CreateIdeaDto, user: AuthUser) {
    const categories = await db.select().from(categoriesTable);

    const [addressDistrict, classification] = await Promise.all([
      this.geocodingService.reverse(dto.lat, dto.lng),
      this.classificationService.classify(
        dto.title,
        dto.description,
        categories,
        dto.photoUrl,
      ),
    ]);

    const category =
      categories.find((c) => c.slug === classification.categorySlug) ?? null;

    return db.transaction(async (tx) => {
      const [idea] = await tx
        .insert(ideasTable)
        .values({
          authorId: user.id,
          title: dto.title,
          description: dto.description,
          lat: dto.lat,
          lng: dto.lng,
          addressDistrict,
          photoUrl: dto.photoUrl,
          categoryId: category?.id ?? null,
          photoFlag: classification.photoFlag,
          photoFlagReason: classification.photoFlagReason,
        })
        .returning();

      const [history] = await tx
        .insert(ideaStatusHistoryTable)
        .values({
          ideaId: idea.id,
          status: 'received',
          changedBy: user.id,
        })
        .returning({
          id: ideaStatusHistoryTable.id,
          status: ideaStatusHistoryTable.status,
          comment: ideaStatusHistoryTable.comment,
          changedBy: ideaStatusHistoryTable.changedBy,
          createdAt: ideaStatusHistoryTable.createdAt,
        });

      return {
        ...this.withCategory(idea, category),
        statusHistory: [history],
      };
    });
  }

  async findAll(query: ListIdeasQueryDto, user: AuthUser) {
    const conditions = this.buildConditions(query, user);
    const where = conditions.length ? and(...conditions) : undefined;
    const offset = (query.page - 1) * query.limit;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({ idea: ideasTable, category: categoriesTable })
        .from(ideasTable)
        .leftJoin(
          categoriesTable,
          eq(ideasTable.categoryId, categoriesTable.id),
        )
        .where(where)
        .orderBy(desc(ideasTable.createdAt))
        .limit(query.limit)
        .offset(offset),
      db
        .select({ value: count() })
        .from(ideasTable)
        .leftJoin(
          categoriesTable,
          eq(ideasTable.categoryId, categoriesTable.id),
        )
        .where(where),
    ]);

    return {
      items: rows.map(({ idea, category }) =>
        this.withCategory(idea, category),
      ),
      total: totalRow.value,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: number, user: AuthUser) {
    const accessCondition =
      user.role === 'resident'
        ? and(eq(ideasTable.id, id), eq(ideasTable.authorId, user.id))
        : eq(ideasTable.id, id);

    const [row] = await db
      .select({ idea: ideasTable, category: categoriesTable })
      .from(ideasTable)
      .leftJoin(categoriesTable, eq(ideasTable.categoryId, categoriesTable.id))
      .where(accessCondition)
      .limit(1);

    if (!row) throw new NotFoundException('Идея не найдена');

    const statusHistory = await db
      .select({
        id: ideaStatusHistoryTable.id,
        status: ideaStatusHistoryTable.status,
        comment: ideaStatusHistoryTable.comment,
        changedBy: ideaStatusHistoryTable.changedBy,
        createdAt: ideaStatusHistoryTable.createdAt,
      })
      .from(ideaStatusHistoryTable)
      .where(eq(ideaStatusHistoryTable.ideaId, id))
      .orderBy(asc(ideaStatusHistoryTable.createdAt));

    return {
      ...this.withCategory(row.idea, row.category),
      statusHistory,
    };
  }

  async getDigest() {
    const now = new Date();
    const currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const baseSelection = {
      category: categoriesTable.slug,
      district: ideasTable.addressDistrict,
      value: count(),
    };

    const [currentRows, previousRows] = await Promise.all([
      db
        .select(baseSelection)
        .from(ideasTable)
        .leftJoin(
          categoriesTable,
          eq(ideasTable.categoryId, categoriesTable.id),
        )
        .where(gte(ideasTable.createdAt, currentStart))
        .groupBy(categoriesTable.slug, ideasTable.addressDistrict),
      db
        .select(baseSelection)
        .from(ideasTable)
        .leftJoin(
          categoriesTable,
          eq(ideasTable.categoryId, categoriesTable.id),
        )
        .where(
          and(
            gte(ideasTable.createdAt, previousStart),
            lt(ideasTable.createdAt, currentStart),
          ),
        )
        .groupBy(categoriesTable.slug, ideasTable.addressDistrict),
    ]);

    const groups = new Map<string, IdeasDigestItemDto>();
    for (const row of previousRows) {
      groups.set(this.digestKey(row.category, row.district), {
        category: row.category,
        district: row.district,
        count: 0,
        previousCount: row.value,
        changePercent: -100,
      });
    }
    for (const row of currentRows) {
      const key = this.digestKey(row.category, row.district);
      const previousCount = groups.get(key)?.previousCount ?? 0;
      groups.set(key, {
        category: row.category,
        district: row.district,
        count: row.value,
        previousCount,
        changePercent:
          previousCount === 0
            ? 100
            : Math.round(((row.value - previousCount) / previousCount) * 100),
      });
    }

    const items = [...groups.values()].sort(
      (a, b) => b.changePercent - a.changePercent || b.count - a.count,
    );

    return { items, insight: items[0] ?? null };
  }

  async updateStatus(id: number, dto: UpdateIdeaStatusDto, user: AuthUser) {
    await db.transaction(async (tx) => {
      const [idea] = await tx
        .select({ id: ideasTable.id, status: ideasTable.status })
        .from(ideasTable)
        .where(eq(ideasTable.id, id))
        .limit(1);

      if (!idea) throw new NotFoundException('Идея не найдена');

      if (
        idea.status === 'done' &&
        (dto.status === 'in_progress' || dto.status === 'in_review')
      ) {
        throw new BadRequestException(
          'Нельзя вернуть завершённую идею в работу или на рассмотрение',
        );
      }

      await tx
        .update(ideasTable)
        .set({ status: dto.status, updatedAt: new Date() })
        .where(eq(ideasTable.id, id));

      await tx.insert(ideaStatusHistoryTable).values({
        ideaId: id,
        status: dto.status,
        comment: dto.comment,
        changedBy: user.id,
      });
    });

    return this.findOne(id, user);
  }

  async submitFeedback(id: number, dto: IdeaFeedbackDto, user: AuthUser) {
    const [idea] = await db
      .select({ authorId: ideasTable.authorId, status: ideasTable.status })
      .from(ideasTable)
      .where(eq(ideasTable.id, id))
      .limit(1);

    if (!idea) throw new NotFoundException('Идея не найдена');
    if (idea.authorId !== user.id) {
      throw new ForbiddenException('Оценить идею может только её автор');
    }
    if (idea.status !== 'done') {
      throw new BadRequestException(
        'Оценить можно только идею со статусом done',
      );
    }

    await db
      .update(ideasTable)
      .set({
        rating: dto.rating,
        ...(dto.comment !== undefined ? { ratingComment: dto.comment } : {}),
        ...(dto.afterPhotoUrl !== undefined
          ? { afterPhotoUrl: dto.afterPhotoUrl }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(ideasTable.id, id));

    return this.findOne(id, user);
  }

  async assign(id: number, assigneeId: number, user: AuthUser) {
    const [assignee] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, assigneeId))
      .limit(1);

    if (!assignee) throw new NotFoundException('Ответственный не найден');
    if (!['gov_official', 'admin'].includes(assignee.role)) {
      throw new BadRequestException(
        'Ответственным может быть только сотрудник госоргана или администратор',
      );
    }

    const [updated] = await db
      .update(ideasTable)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(ideasTable.id, id))
      .returning({ id: ideasTable.id });

    if (!updated) throw new NotFoundException('Идея не найдена');

    return this.findOne(id, user);
  }

  private buildConditions(query: ListIdeasQueryDto, user: AuthUser) {
    const conditions: SQL[] = [];

    if (user.role === 'resident') {
      conditions.push(eq(ideasTable.authorId, user.id));
    }
    if (query.status) conditions.push(eq(ideasTable.status, query.status));
    if (query.category) {
      conditions.push(eq(categoriesTable.slug, query.category));
    }
    if (query.district) {
      conditions.push(ilike(ideasTable.addressDistrict, `%${query.district}%`));
    }
    if (query.search) {
      const search = `%${query.search}%`;
      const textSearch = or(
        ilike(ideasTable.title, search),
        ilike(ideasTable.description, search),
      );
      if (textSearch) conditions.push(textSearch);
    }

    return conditions;
  }

  private withCategory(
    idea: typeof ideasTable.$inferSelect,
    category: typeof categoriesTable.$inferSelect | null,
  ) {
    const { categoryId, ...ideaData } = idea;
    void categoryId;
    return { ...ideaData, category };
  }

  private digestKey(category: string | null, district: string) {
    return JSON.stringify([category, district]);
  }
}
