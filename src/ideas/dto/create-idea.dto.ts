import { ApiProperty } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateIdeaDto {
  @ApiProperty({ example: 'Отремонтировать дорогу возле школы' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'На дороге глубокие ямы, проезд затруднён.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 50.4111 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 80.2275 })
  @IsLongitude()
  lng: number;

  @ApiProperty({ example: 'https://example.com/photos/road.jpg' })
  @IsUrl()
  photoUrl: string;
}
