import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Иван Иванов' })
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: ['resident', 'gov_official', 'admin'] })
  role: 'resident' | 'gov_official' | 'admin';

  @ApiProperty({ nullable: true, example: null })
  avatar: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Успешный вход' })
  message: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ description: 'JWT для Authorization: Bearer <token>' })
  accessToken: string;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Операция выполнена' })
  message: string;
}
