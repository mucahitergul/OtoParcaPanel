import {
  Controller,
  Get,
  Post,
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
  @Post('select-best')
  async selectBestSupplier(@Body() selectionDto: BestSupplierSelectionDto) {
    try {
      const result =
        await this.suppliersService.selectBestSupplier(selectionDto);
      return {
        success: true,
        data: result,
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
}