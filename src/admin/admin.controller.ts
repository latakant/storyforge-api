import {
  Controller, Get, Patch, Param, Body,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { ChangeRoleDto } from './dto/change-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/stats
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // GET /admin/users
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  // PATCH /admin/users/:id/role
  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.changeRole(id, dto.role, user.id);
  }

  // PATCH /admin/users/:id/toggle
  @Patch('users/:id/toggle')
  @HttpCode(HttpStatus.OK)
  toggleStatus(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.adminService.toggleUserStatus(id, user.id);
  }

  // GET /admin/comments/pending
  @Get('comments/pending')
  @Roles(Role.EDITOR, Role.ADMIN)
  getPendingComments() {
    return this.adminService.getPendingComments();
  }
}
