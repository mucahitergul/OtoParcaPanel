import { Controller, Get } from '@nestjs/common';
import { SystemService } from './system.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('status')
  @Public()
  async getSystemStatus() {
    try {
      const status = await this.systemService.getSystemStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Sistem durumu alınamadı',
        error: error.message,
      };
    }
  }

  @Get('health')
  @Public()
  async healthCheck() {
    return {
      success: true,
      message: 'Sistem çalışıyor',
      timestamp: new Date().toISOString(),
    };
  }
}