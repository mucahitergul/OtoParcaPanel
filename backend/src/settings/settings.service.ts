import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../entities/settings.entity';

export interface UpdateSettingDto {
  value: string;
}

export interface ProfitMarginDto {
  default_margin: number;
  category_margins?: Record<string, number>;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {
    this.initializeDefaultSettings();
  }

  /**
   * Initialize default settings if they don't exist
   */
  private async initializeDefaultSettings() {
    const defaultSettings = [
      {
        key: 'default_profit_margin',
        value: '15',
        description: 'Varsayılan kar oranı (%)',
        data_type: 'number' as const,
      },
      {
        key: 'auto_sync_enabled',
        value: 'true',
        description: 'Otomatik senkronizasyon aktif mi',
        data_type: 'boolean' as const,
      },
      {
        key: 'sync_interval_minutes',
        value: '60',
        description: 'Senkronizasyon aralığı (dakika)',
        data_type: 'number' as const,
      },
      {
        key: 'woocommerce_api_url',
        value: '',
        description: 'WooCommerce API URL',
        data_type: 'string' as const,
      },
      {
        key: 'woocommerce_consumer_key',
        value: '',
        description: 'WooCommerce Consumer Key',
        data_type: 'string' as const,
      },
      {
        key: 'woocommerce_consumer_secret',
        value: '',
        description: 'WooCommerce Consumer Secret',
        data_type: 'string' as const,
      },
      {
        key: 'python_scraper_api_url',
        value: 'http://localhost:8000',
        description: 'Python Scraper API URL',
        data_type: 'string' as const,
      },
      {
        key: 'min_stock_threshold',
        value: '5',
        description: 'Minimum stok uyarı seviyesi',
        data_type: 'number' as const,
      },
      {
        key: 'max_price_change_percent',
        value: '20',
        description: 'Maksimum fiyat değişim oranı (%)',
        data_type: 'number' as const,
      },
    ];

    for (const setting of defaultSettings) {
      const existingSetting = await this.settingsRepository.findOne({
        where: { key: setting.key },
      });

      if (!existingSetting) {
        await this.settingsRepository.save(setting);
        this.logger.log(`Initialized default setting: ${setting.key}`);
      }
    }
  }

  /**
   * Get all settings
   */
  async getAllSettings() {
    const settings = await this.settingsRepository.find({
      order: { key: 'ASC' },
    });

    const settingsObject: Record<string, any> = {};
    settings.forEach((setting) => {
      settingsObject[setting.key] = setting.parsed_value;
    });

    return settingsObject;
  }

  /**
   * Get a specific setting by key
   */
  async getSetting(key: string) {
    const setting = await this.settingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return {
      key: setting.key,
      value: setting.parsed_value,
      description: setting.description,
      data_type: setting.data_type,
      updated_at: setting.updated_at,
    };
  }

  /**
   * Update a setting
   */
  async updateSetting(key: string, updateDto: UpdateSettingDto) {
    const setting = await this.settingsRepository.findOne({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    const oldValue = setting.value;
    setting.value = updateDto.value;
    setting.updated_at = new Date();

    await this.settingsRepository.save(setting);

    this.logger.log(
      `Updated setting ${key}: ${oldValue} -> ${updateDto.value}`,
    );

    return {
      key: setting.key,
      old_value: oldValue,
      new_value: updateDto.value,
      parsed_value: setting.parsed_value,
      updated_at: setting.updated_at,
    };
  }

  /**
   * Get profit margin settings
   */
  async getProfitMargins() {
    const defaultMarginSetting = await this.settingsRepository.findOne({
      where: { key: 'default_profit_margin' },
    });

    const categoryMarginsSetting = await this.settingsRepository.findOne({
      where: { key: 'category_profit_margins' },
    });

    return {
      default_margin: defaultMarginSetting
        ? parseFloat(defaultMarginSetting.value)
        : 15,
      category_margins: categoryMarginsSetting
        ? categoryMarginsSetting.parsed_value
        : {},
    };
  }

  /**
   * Update profit margin settings
   */
  async updateProfitMargins(profitMarginDto: ProfitMarginDto) {
    const { default_margin, category_margins } = profitMarginDto;

    // Update default margin
    await this.updateSetting('default_profit_margin', {
      value: default_margin.toString(),
    });

    // Update category margins if provided
    if (category_margins) {
      const categoryMarginsSetting = await this.settingsRepository.findOne({
        where: { key: 'category_profit_margins' },
      });

      if (categoryMarginsSetting) {
        categoryMarginsSetting.value = JSON.stringify(category_margins);
        await this.settingsRepository.save(categoryMarginsSetting);
      } else {
        await this.settingsRepository.save({
          key: 'category_profit_margins',
          value: JSON.stringify(category_margins),
          description: 'Kategori bazlı kar oranları',
          data_type: 'json',
        });
      }
    }

    // Count affected products (mock implementation)
    const affectedProducts = Math.floor(Math.random() * 200) + 50; // Random number for demo

    this.logger.log(`Updated profit margins: default=${default_margin}%`);

    return {
      old_margin: 15, // This should be fetched from previous value
      new_margin: default_margin,
      affected_products: affectedProducts,
      category_margins: category_margins || {},
    };
  }

  /**
   * Get WooCommerce settings
   */
  async getWooCommerceSettings() {
    const settings = await this.settingsRepository.find({
      where: [
        { key: 'woocommerce_api_url' },
        { key: 'woocommerce_consumer_key' },
        { key: 'woocommerce_consumer_secret' },
      ],
    });

    const wooSettings: Record<string, string> = {};
    settings.forEach((setting) => {
      wooSettings[setting.key] = setting.value;
    });

    return wooSettings;
  }

  /**
   * Test WooCommerce connection
   */
  async testWooCommerceConnection() {
    const wooSettings = await this.getWooCommerceSettings();

    if (
      !wooSettings.woocommerce_api_url ||
      !wooSettings.woocommerce_consumer_key
    ) {
      return {
        success: false,
        message: 'WooCommerce API credentials not configured',
      };
    }

    // Mock connection test - in real implementation, this would make an actual API call
    const isConnected = Math.random() > 0.2; // 80% success rate for demo

    return {
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      api_url: wooSettings.woocommerce_api_url,
    };
  }

  /**
   * Reset settings to default values
   */
  async resetToDefaults() {
    await this.settingsRepository.clear();
    await this.initializeDefaultSettings();

    this.logger.log('Reset all settings to default values');

    return {
      message: 'Settings reset to default values',
      timestamp: new Date().toISOString(),
    };
  }
}
