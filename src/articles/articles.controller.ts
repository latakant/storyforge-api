import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { RejectArticleDto } from './dto/reject-article.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // AUTHENTICATED (WRITER+)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WRITER, Role.EDITOR, Role.ADMIN)
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.create(dto, user.id);
  }

  // PUBLIC
  @Get()
  findAll(@Query() query: ListArticlesDto) {
    return this.articlesService.findAll(query);
  }

  // PUBLIC
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  // AUTHENTICATED — own article only
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WRITER, Role.EDITOR, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.update(id, dto, user.id);
  }

  // AUTHENTICATED — own article only
  @Patch(':id/content')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WRITER, Role.EDITOR, Role.ADMIN)
  saveContent(
    @Param('id') id: string,
    @Body('content') content: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.saveContent(id, content, user.id);
  }

  // AUTHENTICATED — own article only
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WRITER, Role.EDITOR, Role.ADMIN)
  submit(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.submit(id, user.id);
  }

  // EDITOR+
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  publish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.publish(id, user.id, user.role);
  }

  // EDITOR+
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.EDITOR, Role.ADMIN)
  reject(
    @Param('id') id: string,
    @Body() dto: RejectArticleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.reject(id, user.id, user.role, dto.editorNote);
  }

  // WRITER (own) | ADMIN
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.WRITER, Role.EDITOR, Role.ADMIN)
  archive(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.archive(id, user.id, user.role);
  }

  // WRITER (own) | EDITOR+
  @Get(':id/revisions')
  @UseGuards(JwtAuthGuard)
  getRevisions(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.articlesService.getRevisions(id, user.id, user.role);
  }
}
