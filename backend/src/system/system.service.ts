import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SystemService {
  constructor(private configService: ConfigService) {}

  async getSystemStatus() {
    const [wooCommerceStatus, pythonScraperStatus, dogusScraperStatus, basbugScraperStatus, dinamikScraperStatus] = await Promise.all([
      this.checkWooCommerceStatus(),
      this.checkPythonScraperStatus(),
      this.checkDogusScraper(),
      this.checkBasbugScraper(),
      this.checkDinamikScraper(),
    ]);

    return {
      woocommerce: wooCommerceStatus,
      pythonScraper: pythonScraperStatus,
      dogusScraper: dogusScraperStatus,
      basbugScraper: basbugScraperStatus,
      dinamikScraper: dinamikScraperStatus,
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
    // Hem production (port 5000) hem de development (port 5001) scraper'larını kontrol et
    const ports = [5000, 5001];
    
    for (const port of ports) {
      try {
        const response = await axios.get(`http://localhost:${port}/health`, {
          timeout: 2000,
        });

        if (response.status === 200) {
          return {
            connected: true,
            lastUpdate: new Date().toLocaleString('tr-TR'),
            status: 'online' as const,
            port: port,
          };
        }
      } catch (error) {
        // Bu port için hata, diğer portu dene
        continue;
      }
    }
    
    // Hiçbir port çalışmıyor
    return {
      connected: false,
      lastUpdate: 'Bağlantı hatası',
      status: 'offline' as const,
    };
  }

  private async checkDogusScraper() {
    try {
      const response = await axios.get('http://localhost:5003/health', {
        timeout: 2000,
      });

      if (response.status === 200) {
        const healthData = response.data as any;
        
        // Check if browser is ready and user is logged in
        const isReady = healthData.browser_ready && healthData.logged_in;
        
        return {
          connected: true,
          lastUpdate: new Date().toLocaleString('tr-TR'),
          status: isReady ? 'online' as const : 'offline' as const,
          browser_ready: healthData.browser_ready || false,
          logged_in: healthData.logged_in || false,
          captcha_waiting: healthData.captcha_waiting || false,
          captcha_resolved: healthData.captcha_resolved || false,
        };
      }
    } catch (error) {
      // Scraper çalışmıyor
    }
    
    return {
      connected: false,
      lastUpdate: 'Bağlantı hatası',
      status: 'offline' as const,
      browser_ready: false,
      logged_in: false,
      captcha_waiting: false,
      captcha_resolved: false,
    };
  }

  private async checkBasbugScraper() {
    try {
      const response = await axios.get('http://localhost:5002/health', {
        timeout: 2000,
      });

      if (response.status === 200) {
        const healthData = response.data as any;
        
        // Check if browser is ready and user is logged in
        const isReady = healthData.browser_ready && healthData.logged_in;
        
        return {
          connected: true,
          lastUpdate: new Date().toLocaleString('tr-TR'),
          status: isReady ? 'online' as const : 'offline' as const,
          browser_ready: healthData.browser_ready || false,
          logged_in: healthData.logged_in || false,
          captcha_waiting: healthData.captcha_waiting || false,
          captcha_resolved: healthData.captcha_resolved || false,
        };
      }
    } catch (error) {
      // Scraper çalışmıyor
    }
    
    return {
      connected: false,
      lastUpdate: 'Bağlantı hatası',
      status: 'offline' as const,
      browser_ready: false,
      logged_in: false,
      captcha_waiting: false,
      captcha_resolved: false,
    };
  }

  private async checkDinamikScraper() {
    try {
      const response = await axios.get('http://localhost:5001/health', {
        timeout: 2000,
      });

      if (response.status === 200) {
        const healthData = response.data as any;
        
        // Check if browser is ready and user is logged in
        const isReady = healthData.browser_ready && healthData.logged_in;
        
        return {
          connected: true,
          lastUpdate: new Date().toLocaleString('tr-TR'),
          status: isReady ? 'online' as const : 'offline' as const,
          browser_ready: healthData.browser_ready || false,
          logged_in: healthData.logged_in || false,
          captcha_waiting: healthData.captcha_waiting || false,
          captcha_resolved: healthData.captcha_resolved || false,
        };
      }
    } catch (error) {
      // Scraper çalışmıyor
    }
    
    return {
      connected: false,
      lastUpdate: 'Bağlantı hatası',
      status: 'offline' as const,
      browser_ready: false,
      logged_in: false,
      captcha_waiting: false,
      captcha_resolved: false,
    };
  }
}