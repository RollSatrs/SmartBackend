import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserListItemDto } from './dto/user-list-item.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Получить список сотрудников госоргана' })
  @ApiOkResponse({ type: UserListItemDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Доступно только госоргану или admin' })
  @Roles('gov_official', 'admin')
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findByRole(query.role);
  }
}
