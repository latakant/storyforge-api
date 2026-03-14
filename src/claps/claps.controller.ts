import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ClapsService } from './claps.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('articles/:articleId/claps')
export class ClapsController {
  constructor(private readonly clapsService: ClapsService) {}

  // AUTHENTICATED — any logged-in user can clap
  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
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
