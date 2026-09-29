import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, type SQL } from 'drizzle-orm';
import { db } from 'src';
import {
  categoriesTable,
  ideasTable,
  ideaStatusHistoryTable,
} from 'src/db/schema';
import type { AuthUser } from 'src/types/express';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { GeocodingService } from './geocoding.service';

@Injectable()
export class IdeasService {
  constructor(private readonly geocodingService: GeocodingService) {}

  async create(dto: CreateIdeaDto, user: AuthUser) {
    const addressDistrict = await this.geocodingService.reverse(
      dto.lat,
      dto.lng,
    );

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
        ...this.withCategory(idea, null),
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
}
