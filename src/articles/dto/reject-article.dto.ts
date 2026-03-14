import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectArticleDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  editorNote: string;
}
