import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignIdeaDto {
  @ApiProperty({ example: 2, description: 'ID сотрудника госоргана' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigneeId: number;
}
