import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class ListUsersQueryDto {
  @ApiProperty({ enum: ['gov_official'] })
  @IsIn(['gov_official'])
  role: 'gov_official';
}
