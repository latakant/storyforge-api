import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great article! Really helped me understand the topic.', minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;

  @ApiPropertyOptional({ example: 'comment-cuid-parent', description: 'Parent comment ID for threaded replies' })
  @IsOptional()
  @IsString()
  parentId?: string;
}
