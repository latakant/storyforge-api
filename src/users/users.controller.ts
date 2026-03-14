import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // PUBLIC
  @Get(':username')
  getProfile(@Param('username') username: string) {
    return this.usersService.getProfile(username);
  }

  // AUTHENTICATED — own profile only
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // AUTHENTICATED
  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  follow(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') targetId: string,
  ) {
    return this.usersService.follow(user.id, targetId);
  }

  // AUTHENTICATED
  @Delete(':id/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') targetId: string,
  ): Promise<void> {
    await this.usersService.unfollow(user.id, targetId);
  }
}
