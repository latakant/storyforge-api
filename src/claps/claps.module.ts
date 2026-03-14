import { Module } from '@nestjs/common';
import { ClapsService } from './claps.service';
import { ClapsController } from './claps.controller';

@Module({
  providers: [ClapsService],
  controllers: [ClapsController],
  exports: [ClapsService],
})
export class ClapsModule {}
