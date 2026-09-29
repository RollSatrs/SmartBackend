import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ParseIdeaDto {
  @ApiProperty({ example: 'Тут яма возле школы, машины объезжают' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;
}

export class ParsedIdeaDto {
  @ApiProperty({ example: 'Яма возле школы' })
  title: string;

  @ApiProperty({
    example: 'Возле школы образовалась яма, машины её объезжают.',
  })
  description: string;

  @ApiProperty({ nullable: true, example: 'roads' })
  categorySlug: string | null;
}
