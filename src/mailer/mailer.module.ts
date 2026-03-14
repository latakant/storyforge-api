import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerService } from './mailer.service';
import { MailerProcessor } from './mailer.processor';
import { MAIL_QUEUE } from './mailer.types';

@Module({
  imports: [
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  providers: [MailerService, MailerProcessor],
  exports: [MailerService],
})
export class MailerModule {}
