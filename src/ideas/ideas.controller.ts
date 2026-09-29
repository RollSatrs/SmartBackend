import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { IdeaDetailsDto, IdeasPageDto } from './dto/idea-response.dto';
import { IdeasDigestDto } from './dto/ideas-digest.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { AssignIdeaDto } from './dto/assign-idea.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { IdeasService } from './ideas.service';

@ApiTags('ideas')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ideas')
export class IdeasController {
  constructor(private readonly ideasService: IdeasService) {}

  @ApiOperation({ summary: 'Создать идею от лица жителя' })
  @ApiCreatedResponse({ type: IdeaDetailsDto })
  @ApiForbiddenResponse({ description: 'Доступно только жителю' })
  @Roles('resident')
  @Post()
  create(@Body() dto: CreateIdeaDto, @Req() request: Request) {
    return this.ideasService.create(dto, request.user!);
  }

  @ApiOperation({
    summary: 'Получить идеи текущего жителя или все идеи для госоргана',
  })
  @ApiOkResponse({ type: IdeasPageDto })
  @Get()
  findAll(@Query() query: ListIdeasQueryDto, @Req() request: Request) {
    return this.ideasService.findAll(query, request.user!);
  }

  @ApiOperation({
    summary: 'Получить недельный дайджест по категориям и районам',
  })
  @ApiOkResponse({ type: IdeasDigestDto })
  @ApiForbiddenResponse({ description: 'Доступно только госоргану или admin' })
  @Roles('gov_official', 'admin')
  @Get('digest')
  getDigest() {
    return this.ideasService.getDigest();
  }

  @ApiOperation({ summary: 'Получить идею с историей статусов' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: IdeaDetailsDto })
  @ApiNotFoundResponse({ description: 'Идея не найдена или недоступна' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.ideasService.findOne(id, request.user!);
  }

  @ApiOperation({ summary: 'Изменить статус идеи' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: IdeaDetailsDto })
  @ApiForbiddenResponse({ description: 'Доступно только госоргану или admin' })
  @ApiNotFoundResponse({ description: 'Идея не найдена' })
  @Roles('gov_official', 'admin')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIdeaStatusDto,
    @Req() request: Request,
  ) {
    return this.ideasService.updateStatus(id, dto, request.user!);
  }

  @ApiOperation({ summary: 'Назначить ответственного за идею' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: IdeaDetailsDto })
  @ApiBadRequestResponse({
    description: 'Пользователь не является сотрудником',
  })
  @ApiForbiddenResponse({ description: 'Доступно только госоргану или admin' })
  @ApiNotFoundResponse({ description: 'Идея или ответственный не найдены' })
  @Roles('gov_official', 'admin')
  @Patch(':id/assignee')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignIdeaDto,
    @Req() request: Request,
  ) {
    return this.ideasService.assign(id, dto.assigneeId, request.user!);
  }
}
