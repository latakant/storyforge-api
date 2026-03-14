import { IsString, IsOptional, MinLength, MaxLength, IsUrl, IsArray, IsString as IsStr } from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsStr({ each: true })
  tagIds?: string[];
}
