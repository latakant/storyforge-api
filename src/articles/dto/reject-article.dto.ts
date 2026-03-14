import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectArticleDto {
  @ApiProperty({ example: 'Needs more supporting evidence and clearer structure.', minLength: 10, maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  editorNote: string;
}
