import { Module } from '@nestjs/common';
import { TuuOnlineService } from './tuu-online.service';
import { TuuTerminalService } from './tuu-terminal.service';

@Module({
    providers: [TuuOnlineService, TuuTerminalService],
    exports: [TuuOnlineService, TuuTerminalService],
})
export class TuuModule {}
