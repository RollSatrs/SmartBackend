import { Transform, type TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class GeocodingSearchQueryDto {
  @ApiProperty({ example: 'Абая', minLength: 2, maxLength: 200 })
  @Transform(({ value }: TransformFnParams) => {
    const query: unknown = value;
    return typeof query === 'string' ? query.trim() : query;
  })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q: string;
}

export class GeocodingSearchResultDto {
  @ApiProperty({ example: 'проспект Абая, Семей, Абай облысы, Қазақстан' })
  displayName: string;

  @ApiProperty({ example: 50.4111 })
  lat: number;

  @ApiProperty({ example: 80.2275 })
  lng: number;
}
