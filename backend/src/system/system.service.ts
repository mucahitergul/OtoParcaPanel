import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SystemService {
  constructor(private configService: ConfigService) {}

  async getSystemStatus() {
    const [wooCommerceStatus, pythonScraperStatus] = await Promise.all([
      this.checkWooCommerceStatus(),
      this.checkPythonScraperStatus(),
    ]);

    return {
      woocommerce: wooCommerceStatus,
      pythonScraper: pythonScraperStatus,
    };
  }

  private async checkWooCommerceStatus() {
    try {
      const wooUrl = this.configService.get('WOO_URL');
      const wooKey = this.configService.get('WOO_CONSUMER_KEY');
      const wooSecret = this.configService.get('WOO_CONSUMER_SECRET');

      if (!wooUrl || !wooKey || !wooSecret) {
        return {
          connected: false,
          lastSync: 'Yapılandırma eksik',
          status: 'error' as const,
        };
      }

      // WooCommerce API'ye basit bir test isteği gönder
      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/system_status`, {
        auth: {
          username: wooKey,
          password: wooSecret,
        },
        timeout: 5000,
      });

      if (response.status === 200) {
        return {
          connected: true,
          lastSync: new Date().toLocaleString('tr-TR'),
          status: 'online' as const,
        };
      } else {
        return {
          connected: false,
          lastSync: 'Bağlantı başarısız',
          status: 'error' as const,
        };
      }
    } catch (error) {
      return {
        connected: false,
        lastSync: 'Bağlantı hatası',
        status: 'error' as const,
      };
    }
  }

  private async checkPythonScraperStatus() {
    try {
      // Python scraper'ın health endpoint'ini kontrol et
      const response = await axios.get('http://localhost:3001/api/scraper/health', {
        timeout: 3000,
      });

      if (response.status === 200) {
        return {
          connected: true,
          lastUpdate: new Date().toLocaleString('tr-TR'),
          status: 'online' as const,
        };
      } else {
        return {
          connected: false,
          lastUpdate: 'Bağlantı başarısız',
          status: 'error' as const,
        };
      }
    } catch (error) {
      return {
        connected: false,
        lastUpdate: 'Bağlantı hatası',
        status: 'offline' as const,
      };
    }
  }
}