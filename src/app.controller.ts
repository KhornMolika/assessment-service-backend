import { Controller, Get } from '@nestjs/common';
import { Public } from './modules/auth/guards/public.decorator';

@Controller('health')
export class AppController {
  @Get()
  @Public()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'assessment-service',
    };
  }
}
