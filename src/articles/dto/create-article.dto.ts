import { IsString, MinLength, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;
}
