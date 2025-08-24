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

@Controller('settings')
@UseGuards(JwtAuthGuard)
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
   * Test WooCommerce connection
   */
  @Post('woocommerce/test-connection')
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