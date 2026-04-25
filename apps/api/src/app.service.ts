import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'LOMASRICO API WORKING V3';
  }
}
