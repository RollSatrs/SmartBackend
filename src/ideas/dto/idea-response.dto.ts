import { ApiProperty } from '@nestjs/swagger';
import { ideaStatusEnum } from 'src/db/schema';

export class IdeaCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Дороги' })
  name: string;

  @ApiProperty({ example: 'roads' })
  slug: string;
}

export class IdeaStatusHistoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: ideaStatusEnum.enumValues })
  status: (typeof ideaStatusEnum.enumValues)[number];

  @ApiProperty({ nullable: true })
  comment: string | null;

  @ApiProperty({ example: 1 })
  changedBy: number;

  @ApiProperty()
  createdAt: Date;
}

export class IdeaDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  authorId: number;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true, type: IdeaCategoryDto })
  category: IdeaCategoryDto | null;

  @ApiProperty({ enum: ideaStatusEnum.enumValues })
  status: (typeof ideaStatusEnum.enumValues)[number];

  @ApiProperty()
  lat: number;

  @ApiProperty()
  lng: number;

  @ApiProperty()
  addressDistrict: string;

  @ApiProperty()
  photoUrl: string;

  @ApiProperty({ nullable: true })
  assigneeId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class IdeaDetailsDto extends IdeaDto {
  @ApiProperty({ type: [IdeaStatusHistoryDto] })
  statusHistory: IdeaStatusHistoryDto[];
}

export class IdeasPageDto {
  @ApiProperty({ type: [IdeaDto] })
  items: IdeaDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
