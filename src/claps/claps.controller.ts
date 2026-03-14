import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClapsService } from './claps.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('claps')
@ApiBearerAuth('access-token')
@Controller('articles/:articleId/claps')
export class ClapsController {
  constructor(private readonly clapsService: ClapsService) {}

  // AUTHENTICATED — 50 claps/min per IP
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Throttle({ claps: { limit: 50, ttl: 60_000 } })
  clap(
    @Param('articleId') articleId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clapsService.clap(articleId, user.id);
  }

  // PUBLIC — get clap count
  @Get()
  getCount(@Param('articleId') articleId: string) {
    return this.clapsService.getCount(articleId);
  }
}
