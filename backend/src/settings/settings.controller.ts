import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { UpdateSettingDto, ProfitMarginDto } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * Get all settings
   */
  @Get()
  async getAllSettings() {
    try {
      const settings = await this.settingsService.getAllSettings();
      return {
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get supplier-specific profit margins
   */
  @Public()
  @Get('supplier-profit-margins')
  async getSupplierProfitMargins() {
    try {
      const margins = await this.settingsService.getSupplierProfitMargins();
      return {
        success: true,
        data: margins,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch supplier profit margins',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update supplier-specific profit margins
   */
  @Put('supplier-profit-margins')
  @UseGuards(JwtAuthGuard)
  async updateSupplierProfitMargins(@Body() profitMargins: {
    dinamik_margin?: number;
    basbug_margin?: number;
    dogus_margin?: number;
  }) {
    try {
      await this.settingsService.updateSupplierProfitMargins(profitMargins);
      return {
        success: true,
        message: 'Supplier profit margins updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update supplier profit margins',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get a specific setting
   */
  @Get(':key')
  async getSetting(@Param('key') key: string) {
    try {
      const setting = await this.settingsService.getSetting(key);
      return {
        success: true,
        data: setting,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch setting',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a setting
   */
  @Put(':key')
  @UseGuards(JwtAuthGuard)
  async updateSetting(
    @Param('key') key: string,
    @Body() updateDto: UpdateSettingDto,
  ) {
    try {
      const result = await this.settingsService.updateSetting(key, updateDto);
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
          message: 'Failed to update setting',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get profit margin settings
   */
  @Get('profit-margins/current')
  async getProfitMargins() {
    try {
      const margins = await this.settingsService.getProfitMargins();
      return {
        success: true,
        data: margins,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch profit margins',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update profit margin settings
   */
  @Put('profit-margins')
  @UseGuards(JwtAuthGuard)
  async updateProfitMargins(@Body() profitMarginDto: ProfitMarginDto) {
    try {
      const result =
        await this.settingsService.updateProfitMargins(profitMarginDto);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update profit margins',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  /**
   * Get WooCommerce settings
   */
  @Get('woocommerce/config')
  async getWooCommerceSettings() {
    try {
      const settings = await this.settingsService.getWooCommerceSettings();
      return {
        success: true,
        data: settings,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch WooCommerce settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update WooCommerce settings
   */
  @Put('woocommerce/config')
  @UseGuards(JwtAuthGuard)
  async updateWooCommerceSettings(
    @Body() wooSettings: {
      woocommerce_api_url: string;
      woocommerce_consumer_key: string;
      woocommerce_consumer_secret: string;
    }
  ) {
    try {
      // Update each WooCommerce setting
      const updatePromises = [
        this.settingsService.updateSetting('woocommerce_api_url', { value: wooSettings.woocommerce_api_url }),
        this.settingsService.updateSetting('woocommerce_consumer_key', { value: wooSettings.woocommerce_consumer_key }),
        this.settingsService.updateSetting('woocommerce_consumer_secret', { value: wooSettings.woocommerce_consumer_secret }),
      ];

      await Promise.all(updatePromises);

      return {
        success: true,
        message: 'WooCommerce settings updated successfully',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to update WooCommerce settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Test WooCommerce connection
   */
  @Post('woocommerce/test-connection')
  @UseGuards(JwtAuthGuard)
  async testWooCommerceConnection() {
    try {
      const result = await this.settingsService.testWooCommerceConnection();
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to test WooCommerce connection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reset settings to defaults
   */
  @Post('reset-defaults')
  @UseGuards(JwtAuthGuard)
  async resetToDefaults() {
    try {
      const result = await this.settingsService.resetToDefaults();
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to reset settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}