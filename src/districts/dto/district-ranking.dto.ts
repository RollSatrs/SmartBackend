import { ApiProperty } from '@nestjs/swagger';

export class DistrictRankingItemDto {
  @ApiProperty({ example: 'Семей' })
  district: string;

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 8 })
  resolved: number;

  @ApiProperty({ example: 67, description: 'Процент решённых идей' })
  resolvedPercent: number;

  @ApiProperty({ example: 92, description: 'resolved * 10 + total' })
  score: number;
}
