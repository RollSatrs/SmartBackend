import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GeocodingSearchQueryDto,
  GeocodingSearchResultDto,
} from './dto/geocoding-search.dto';
import { GeocodingService } from './geocoding.service';

@ApiTags('geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @ApiOperation({ summary: 'Найти улицу или адрес в городе Семей' })
  @ApiOkResponse({ type: GeocodingSearchResultDto, isArray: true })
  @Get('search')
  search(@Query() query: GeocodingSearchQueryDto) {
    return this.geocodingService.search(query.q);
  }
}
