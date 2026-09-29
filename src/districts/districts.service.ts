import { Injectable } from '@nestjs/common';
import { count, sql } from 'drizzle-orm';
import { db } from 'src';
import { ideasTable } from 'src/db/schema';

@Injectable()
export class DistrictsService {
  async getRanking() {
    const rows = await db
      .select({
        district: ideasTable.addressDistrict,
        total: count(),
        resolved: sql<number>`count(*) filter (where ${ideasTable.status} = 'done')::int`,
      })
      .from(ideasTable)
      .groupBy(ideasTable.addressDistrict);

    return rows
      .map((row) => ({
        district: row.district,
        total: row.total,
        resolved: row.resolved,
        resolvedPercent: Math.round((row.resolved / row.total) * 100),
        score: row.resolved * 10 + row.total,
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.resolved - a.resolved ||
          a.district.localeCompare(b.district),
      );
  }
}
