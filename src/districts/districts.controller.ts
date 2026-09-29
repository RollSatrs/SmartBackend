import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { DistrictRankingItemDto } from './dto/district-ranking.dto';
import { DistrictsService } from './districts.service';

@ApiTags('districts')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @ApiOperation({ summary: 'Получить рейтинг районов' })
  @ApiOkResponse({ type: DistrictRankingItemDto, isArray: true })
  @Get('ranking')
  getRanking() {
    return this.districtsService.getRanking();
  }
}
