import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DiscoveryService } from './discovery.service';

@ApiTags('discovery')
@Controller('discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // PUBLIC — paginated published articles, optional tag filter
  @Get('articles')
  listArticles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tag') tag?: string,
  ) {
    return this.discoveryService.listArticles(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      tag,
    );
  }

  // PUBLIC — all tags with article counts
  @Get('tags')
  listTags() {
    return this.discoveryService.listTags();
  }

  // PUBLIC — trending articles (most claps, last 30 days)
  @Get('trending')
  trending(@Query('limit') limit?: string) {
    return this.discoveryService.trending(limit ? parseInt(limit, 10) : 10);
  }
}
