import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { BrevoService } from './brevo.service';

@Module({
    controllers: [MailController],
    providers: [BrevoService],
    exports: [BrevoService],
})
export class MailModule {}
