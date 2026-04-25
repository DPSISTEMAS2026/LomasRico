import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Helper for assets (Approved to keep valid image selector)
  @Get('assets/list')
  getAssets() {
    try {
      // Adjusted path to project root assets
      const assetsDir = path.join(process.cwd(), 'assets');
      if (!fs.existsSync(assetsDir)) {
        // Fallback to web public if root doesn't work (development structure vary)
        return [];
      }
      return fs.readdirSync(assetsDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    } catch {
      return [];
    }
  }
}
