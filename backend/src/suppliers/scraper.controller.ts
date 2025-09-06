import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';

@Controller('scraper')
@Public()
export class ScraperController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Health check endpoint for scraper
   */
  @Get('health')
  async healthCheck() {
    return {
      success: true,
      message: 'Scraper API is running',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all suppliers (public endpoint for scraper)
   */
  @Get('suppliers')
  async getAllSuppliers() {
    try {
      const suppliers = await this.suppliersService.getAllSuppliers();
      return {
        success: true,
        data: suppliers,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch suppliers',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update single product price from scraper
   */
  @Post('update-price')
  async updateSinglePrice(@Body() updateDto: { 
    stockCode: string;
    foundAtSupplier: boolean;
    price: number;
    isAvailable: boolean;
    supplier: string;
    stock: number;
    productId: number;
  }) {
    try {
      const result = await this.suppliersService.saveScraperData(updateDto);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update supplier price from scraper',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get supplier prices for a specific product (public endpoint)
   */
  @Get('prices/:productId')
  async getSupplierPrices(@Param('productId', ParseIntPipe) productId: number) {
    try {
      const supplierPrices =
        await this.suppliersService.getSupplierPrices(productId);
      return {
        success: true,
        data: supplierPrices,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch supplier prices',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Request price update from scraper bot
   */
  @Post('request-update')
  async requestPriceUpdate(@Body() requestDto: {
    stockCode: string;
    supplier: string;
    productId?: number;
  }) {
    try {
      const { stockCode, supplier, productId } = requestDto;
      
      if (!stockCode || !supplier) {
        throw new HttpException(
          {
            success: false,
            message: 'Stock code and supplier are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Determine scraper port based on supplier
      let scraperPort = 5001; // Default port
      if (supplier === 'basbug') {
        scraperPort = 5002;
      }
      
      // First check CAPTCHA status for Başbuğ
      if (supplier === 'basbug') {
        try {
          const captchaResponse = await axios.get(`http://localhost:${scraperPort}/captcha-status`, {
            timeout: 5000,
          });
          
          if ((captchaResponse.data as any).captcha_waiting) {
            throw new HttpException(
              {
                success: false,
                message: 'Scraper is waiting for CAPTCHA resolution',
                captcha_waiting: true,
                supplier: supplier,
              },
              HttpStatus.LOCKED, // 423 Locked
            );
          }
        } catch (captchaError) {
          if (captchaError.status === HttpStatus.LOCKED) {
            throw captchaError; // Re-throw CAPTCHA waiting error
          }
          // If CAPTCHA status check fails, continue with scraping (might be connection issue)
        }
      }

      // Call scraper bot API
      const scraperResponse = await axios.post(`http://localhost:${scraperPort}/scrape`, {
        stockCode,
        supplier,
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // If productId is provided and scraper was successful, save to database
      if (productId && scraperResponse.data && (scraperResponse.data as any).success) {
        try {
          const scrapedData = scraperResponse.data as any;
          await this.suppliersService.saveScraperData({
            productId,
            stockCode,
            supplier,
            price: scrapedData.price,
            stock: scrapedData.stock,
            isAvailable: scrapedData.isAvailable,
          });
        } catch (dbError) {
          // Log database error but don't fail the request
          console.error('Failed to save scraper data to database:', dbError);
        }
      }

      return {
        success: true,
        data: scraperResponse.data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          {
            success: false,
            message: 'Scraper bot is not running or not accessible',
            error: 'Connection refused to scraper bot',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to request price update from scraper',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Check CAPTCHA status for a specific supplier
   */
  @Get('captcha-status/:supplier')
  async getCaptchaStatus(@Param('supplier') supplier: string) {
    try {
      // Determine scraper port based on supplier
      let scraperPort = 5001; // Default port
      if (supplier === 'basbug') {
        scraperPort = 5002;
      }
      
      const response = await axios.get(`http://localhost:${scraperPort}/captcha-status`, {
        timeout: 5000,
      });
      
      return {
        success: true,
        data: response.data,
        supplier: supplier,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get CAPTCHA status',
          error: error.message,
          supplier: supplier,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Mark CAPTCHA as resolved for a specific supplier
   */
  @Post('resolve-captcha/:supplier')
  async resolveCaptcha(@Param('supplier') supplier: string) {
    try {
      // Determine scraper port based on supplier
      let scraperPort = 5001; // Default port
      if (supplier === 'basbug') {
        scraperPort = 5002;
      }
      
      const response = await axios.post(`http://localhost:${scraperPort}/continue-captcha`, {}, {
        timeout: 5000,
      });
      
      return {
        success: true,
        data: response.data,
        supplier: supplier,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to resolve CAPTCHA',
          error: error.message,
          supplier: supplier,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Register scraper bot
   */
  @Post('register')
  async registerScraper(@Body() registrationData: {
    name: string;
    ipAddress: string;
    port: number;
    capabilities: string[];
  }) {
    try {
      const { name, ipAddress, port, capabilities } = registrationData;
      
      if (!name || !ipAddress || !port) {
        throw new HttpException(
          {
            success: false,
            message: 'Name, IP address and port are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate a unique scraper ID
      const scraperId = `scraper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In a real implementation, you would save this to database
      // For now, we'll just return success with the generated ID
      
      return {
        success: true,
        scraperId,
        message: 'Scraper registered successfully',
        registeredAt: new Date().toISOString(),
        data: {
          name,
          ipAddress,
          port,
          capabilities,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to register scraper',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Heartbeat endpoint for scraper
   */
  @Post('heartbeat/:scraperId')
  async scraperHeartbeat(@Param('scraperId') scraperId: string) {
    try {
      // In a real implementation, you would update the last seen timestamp in database
      return {
        success: true,
        message: 'Heartbeat received',
        scraperId,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to process heartbeat',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test endpoint for scraper connection
   */
  @Post('test')
  async testConnection(@Body() testData: any) {
    return {
      success: true,
      message: 'Scraper connection test successful',
      received_data: testData,
      timestamp: new Date().toISOString(),
    };
  }
}