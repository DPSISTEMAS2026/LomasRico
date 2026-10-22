import { Module } from '@nestjs/common';
import { PointTerminalService } from './point-terminal.service';
import { TuuOnlineService } from './tuu-online.service';
import { TuuTerminalService } from './tuu-terminal.service';

@Module({
    providers: [TuuOnlineService, PointTerminalService, TuuTerminalService],
    exports: [TuuOnlineService, TuuTerminalService],
})
export class TuuModule {}
