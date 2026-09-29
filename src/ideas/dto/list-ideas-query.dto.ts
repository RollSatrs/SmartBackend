import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ideaStatusEnum } from 'src/db/schema';

export class ListIdeasQueryDto {
  @ApiPropertyOptional({ enum: ideaStatusEnum.enumValues })
  @IsOptional()
  @IsIn(ideaStatusEnum.enumValues)
  status?: (typeof ideaStatusEnum.enumValues)[number];

  @ApiPropertyOptional({ description: 'Slug категории', example: 'roads' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Абайский район' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: 'Поиск по названию и описанию' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
