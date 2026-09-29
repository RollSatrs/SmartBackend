import { ApiProperty } from '@nestjs/swagger';

export class IdeasDigestItemDto {
  @ApiProperty({ nullable: true, example: 'roads' })
  category: string | null;

  @ApiProperty({ example: 'Семей' })
  district: string;

  @ApiProperty({ example: 8 })
  count: number;

  @ApiProperty({ example: 5 })
  previousCount: number;

  @ApiProperty({ example: 60, description: 'Изменение в процентах' })
  changePercent: number;
}

export class IdeasDigestDto {
  @ApiProperty({ type: [IdeasDigestItemDto] })
  items: IdeasDigestItemDto[];

  @ApiProperty({ type: IdeasDigestItemDto, nullable: true })
  insight: IdeasDigestItemDto | null;
}
