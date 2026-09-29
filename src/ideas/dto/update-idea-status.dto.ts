import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const UPDATABLE_IDEA_STATUSES = [
  'in_review',
  'in_progress',
  'done',
  'rejected',
  'needs_clarification',
] as const;

const COMMENT_REQUIRED_STATUSES = ['rejected', 'needs_clarification'];

export class UpdateIdeaStatusDto {
  @ApiProperty({ enum: UPDATABLE_IDEA_STATUSES })
  @IsIn(UPDATABLE_IDEA_STATUSES)
  status: (typeof UPDATABLE_IDEA_STATUSES)[number];

  @ApiPropertyOptional({
    description: 'Обязателен для rejected и needs_clarification',
  })
  @ValidateIf(
    (dto: UpdateIdeaStatusDto) =>
      dto.comment !== undefined ||
      COMMENT_REQUIRED_STATUSES.includes(dto.status),
  )
  @Transform(({ value }: TransformFnParams) => {
    const comment: unknown = value;
    return typeof comment === 'string' ? comment.trim() : comment;
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  comment?: string;
}
