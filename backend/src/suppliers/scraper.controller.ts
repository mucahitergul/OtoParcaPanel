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
    product_id: number; 
    supplier: string; 
    stok_kodu: string;
    price?: number;
    stock_quantity?: number;
    stock_status?: string;
  }) {
    try {
      const result = await this.suppliersService.updateSinglePrice(updateDto);
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
  }) {
    try {
      const { stockCode, supplier } = requestDto;
      
      if (!stockCode || !supplier) {
        throw new HttpException(
          {
            success: false,
            message: 'Stock code and supplier are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Call scraper bot API
      const scraperResponse = await axios.post('http://localhost:5000/scrape', {
        stockCode,
        supplier,
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

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