import { IsString, IsOptional, MinLength, MaxLength, IsUrl, IsArray, IsString as IsStr } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateArticleDto {
  @ApiPropertyOptional({ example: 'Updated Title', minLength: 3, maxLength: 200 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cover.jpg' })
  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: ['tag-cuid-1', 'tag-cuid-2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsStr({ each: true })
  tagIds?: string[];
}
