import { ApiProperty } from '@nestjs/swagger';

export class UserListItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Иванов И.И.' })
  name: string;

  @ApiProperty({ example: 'ivanov@akimat.kz' })
  email: string;
}
