import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import type { BestSupplierSelectionDto, BulkBestSupplierSelectionDto } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import axios from 'axios';

@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Get all suppliers
   */
  @Get()
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
   * Get supplier prices for a specific product
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
   * Update supplier prices for products
   */
  @Post('update-prices')
  async updateSupplierPrices(@Body() updateDto: any) {
    try {
      const result =
        await this.suppliersService.updateSupplierPrices(updateDto);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update supplier prices',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update single product price from specific supplier
   */
  @Post('update-single-price')
  async updateSinglePrice(@Body() updateDto: { product_id: number; supplier: string; stok_kodu: string }) {
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
          message: 'Failed to update single supplier price',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Select best supplier for a product
   */
  @Public()
  @Post('select-best')
  async selectBestSupplier(@Body() selectionDto: BestSupplierSelectionDto) {
    try {
      const result =
        await this.suppliersService.selectBestSupplier(selectionDto);
      return {
        success: true,
        data: result,
        updatedPrice: result.data.calculated_price,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to select best supplier',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Select best suppliers for multiple products
   */
  @Public()
  @Post('select-best-bulk')
  async selectBestSuppliersBulk(
    @Body() bulkSelectionDto: BulkBestSupplierSelectionDto,
  ) {
    try {
      const result =
        await this.suppliersService.selectBestSuppliersBulk(bulkSelectionDto);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to select best suppliers',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Scrape price for Başbuğ supplier
   */
  @Post('basbug/scrape')
  @Public()
  async scrapeBasbugPrice(@Body() requestDto: {
    productId: number;
    stockCode: string;
  }) {
    try {
      const { productId, stockCode } = requestDto;
      
      if (!productId || !stockCode) {
        throw new HttpException(
          {
            success: false,
            message: 'Product ID and stock code are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Call scraper bot API
      const scraperResponse = await axios.post('http://localhost:5002/scrape', {
        stockCode,
        supplier: 'basbug',
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // If scraper was successful, save to database
      if (scraperResponse.data && (scraperResponse.data as any).success) {
        try {
          const scrapedData = scraperResponse.data as any;
          await this.suppliersService.saveScraperData({
            productId,
            stockCode,
            supplier: 'basbug',
            price: scrapedData.price,
            stock: scrapedData.stock,
            isAvailable: scrapedData.isAvailable,
            foundAtSupplier: scrapedData.foundAtSupplier,
          });

          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            timestamp: new Date().toISOString(),
          };
        } catch (dbError) {
          // Log database error but return scraper data
          console.error('Failed to save scraper data to database:', dbError);
          const scrapedData = scraperResponse.data as any;
          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            warning: 'Data not saved to database',
            timestamp: new Date().toISOString(),
          };
        }
      } else {
        throw new HttpException(
          {
            success: false,
            message: 'Scraper failed to get data',
            error: (scraperResponse.data as any)?.error || 'Unknown scraper error',
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new HttpException(
          {
            success: false,
            message: 'Scraper bot is not running',
            error: 'Connection refused to scraper bot',
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      if (error.status) {
        throw error;
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to scrape Başbuğ price',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Scrape Dinamik price for a specific product
   */
  @Post('dinamik/scrape')
  @Public()
  async scrapeDinamikPrice(@Body() requestDto: {
    productId: number;
    stockCode: string;
  }) {
    try {
      const { productId, stockCode } = requestDto;
      
      if (!productId || !stockCode) {
        throw new HttpException(
          {
            success: false,
            message: 'Product ID and stock code are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Call scraper bot API with extended timeout for CAPTCHA handling
      const scraperResponse = await axios.post('http://localhost:5001/scrape', {
        stockCode,
        supplier: 'dinamik',
      }, {
        timeout: 120000, // 2 minute timeout for CAPTCHA handling
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // If scraper was successful, save to database
      if (scraperResponse.data && (scraperResponse.data as any).success) {
        try {
          const scrapedData = scraperResponse.data as any;
          await this.suppliersService.saveScraperData({
            productId,
            stockCode,
            supplier: 'dinamik',
            price: scrapedData.price,
            stock: scrapedData.stock,
            isAvailable: scrapedData.isAvailable,
            foundAtSupplier: scrapedData.foundAtSupplier,
          });

          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            timestamp: new Date().toISOString(),
          };
        } catch (dbError) {
          // Log database error but return scraper data
          console.error('Failed to save scraper data to database:', dbError);
          const scrapedData = scraperResponse.data as any;
          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            timestamp: new Date().toISOString(),
            warning: 'Data retrieved but not saved to database',
          };
        }
      } else {
        throw new HttpException(
          {
            success: false,
            message: 'Scraper bot could not retrieve data',
            data: scraperResponse.data,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
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
      
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new HttpException(
          {
            success: false,
            message: 'Scraper request timed out - CAPTCHA may be required',
            error: 'Request timeout - possible CAPTCHA intervention needed',
            requiresManualIntervention: true,
          },
          HttpStatus.REQUEST_TIMEOUT,
        );
      }
      
      throw new HttpException(
        {
          success: false,
          message: 'Failed to scrape Dinamik price',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Scrape price for Doğuş supplier
   */
  @Post('dogus/scrape')
  @Public()
  async scrapeDogusPrice(@Body() requestDto: {
    productId: number;
    stockCode: string;
  }) {
    try {
      const { productId, stockCode } = requestDto;
      
      if (!productId || !stockCode) {
        throw new HttpException(
          {
            success: false,
            message: 'Product ID and stock code are required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Call scraper bot API
      const scraperResponse = await axios.post('http://localhost:5003/scrape', {
        stockCode,
        supplier: 'dogus',
      }, {
        timeout: 10000, // 10 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      // Handle scraper response
      const scrapedData = scraperResponse.data as any;
      
      // If scraper was successful, save to database
      if (scrapedData && scrapedData.success) {
        try {
          await this.suppliersService.saveScraperData({
            productId,
            stockCode,
            supplier: 'dogus',
            price: scrapedData.price,
            stock: scrapedData.stock,
            isAvailable: scrapedData.isAvailable,
            foundAtSupplier: scrapedData.foundAtSupplier,
          });

          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            timestamp: new Date().toISOString(),
          };
        } catch (dbError) {
          console.error('Failed to save Doğuş scraper data to database:', dbError);
          // Return scraper data even if database save fails
          return {
            success: true,
            data: {
              price: scrapedData.price,
              stock: scrapedData.stock,
              isAvailable: scrapedData.isAvailable,
            },
            timestamp: new Date().toISOString(),
            warning: 'Data retrieved but not saved to database',
          };
        }
      } else {
        // Handle "Bu Tedarikçide Yok" case - this is not an error
        if (scrapedData && scrapedData.message && scrapedData.message.includes('Bu Tedarikçide Yok')) {
          try {
            await this.suppliersService.saveScraperData({
              productId,
              stockCode,
              supplier: 'dogus',
              price: 0,
              stock: 0,
              isAvailable: false,
              foundAtSupplier: false,
            });
          } catch (dbError) {
            console.error('Failed to save Doğuş "not found" data to database:', dbError);
          }
          
          return {
            success: false,
            message: 'Bu Tedarikçide Yok',
            data: {
              price: 0,
              stock: 0,
              isAvailable: false,
            },
            timestamp: new Date().toISOString(),
          };
        }
        
        // Other scraper errors
        throw new HttpException(
          {
            success: false,
            message: 'Scraper bot could not retrieve data',
            data: scraperResponse.data,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }
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
          message: 'Failed to scrape Doğuş price',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Remove supplier data for a specific product and supplier
   */
  @Delete(':supplier/:productId')
  async removeSupplierData(
    @Param('supplier') supplier: string,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    try {
      const result = await this.suppliersService.removeSupplierData(productId, supplier);
      return {
        success: true,
        data: result,
        message: `${supplier} tedarikçi bilgileri başarıyla silindi`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: `Failed to remove ${supplier} supplier data`,
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}