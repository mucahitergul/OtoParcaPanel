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
      {
        key: 'dinamik_profit_margin',
        value: '20',
        description: 'Dinamik tedarikçi kar oranı (%)',
        data_type: 'number' as const,
      },
      {
        key: 'basbug_profit_margin',
        value: '25',
        description: 'Başbuğ tedarikçi kar oranı (%)',
        data_type: 'number' as const,
      },
      {
        key: 'dogus_profit_margin',
        value: '22',
        description: 'Doğuş tedarikçi kar oranı (%)',
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
   * Get supplier-specific profit margins
   */
  async getSupplierProfitMargins() {
    const dinamikMargin = await this.settingsRepository.findOne({
      where: { key: 'dinamik_profit_margin' },
    });
    const basbuğMargin = await this.settingsRepository.findOne({
      where: { key: 'basbug_profit_margin' },
    });
    const dogusMargin = await this.settingsRepository.findOne({
      where: { key: 'dogus_profit_margin' },
    });

    return {
      dinamik_margin: dinamikMargin ? parseFloat(dinamikMargin.value) : 20,
      basbug_margin: basbuğMargin ? parseFloat(basbuğMargin.value) : 25,
      dogus_margin: dogusMargin ? parseFloat(dogusMargin.value) : 22,
    };
  }

  /**
   * Update supplier-specific profit margins
   */
  async updateSupplierProfitMargins(margins: {
    dinamik_margin?: number;
    basbug_margin?: number;
    dogus_margin?: number;
  }) {
    const updates: string[] = [];

    if (margins.dinamik_margin !== undefined) {
      await this.updateSetting('dinamik_profit_margin', {
        value: margins.dinamik_margin.toString(),
      });
      updates.push(`Dinamik: ${margins.dinamik_margin}%`);
    }

    if (margins.basbug_margin !== undefined) {
      await this.updateSetting('basbug_profit_margin', {
        value: margins.basbug_margin.toString(),
      });
      updates.push(`Başbuğ: ${margins.basbug_margin}%`);
    }

    if (margins.dogus_margin !== undefined) {
      await this.updateSetting('dogus_profit_margin', {
        value: margins.dogus_margin.toString(),
      });
      updates.push(`Doğuş: ${margins.dogus_margin}%`);
    }

    this.logger.log(`Updated supplier profit margins: ${updates.join(', ')}`);

    return {
      success: true,
      updated_margins: margins,
      message: `Updated ${updates.length} supplier margin(s)`,
    };
  }

  /**
   * Get profit margin for specific supplier
   */
  async getSupplierProfitMargin(supplierName: 'Dinamik' | 'Başbuğ' | 'Doğuş'): Promise<number> {
    const keyMap = {
      'Dinamik': 'dinamik_profit_margin',
      'Başbuğ': 'basbug_profit_margin',
      'Doğuş': 'dogus_profit_margin',
    };

    const defaultMargins = {
      'Dinamik': 20,
      'Başbuğ': 25,
      'Doğuş': 22,
    };

    const setting = await this.settingsRepository.findOne({
      where: { key: keyMap[supplierName] },
    });

    return setting ? parseFloat(setting.value) : defaultMargins[supplierName];
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
      !wooSettings.woocommerce_consumer_key ||
      !wooSettings.woocommerce_consumer_secret
    ) {
      return {
        success: false,
        message: 'WooCommerce API credentials not configured',
      };
    }

    try {
      const axios = require('axios');
      const https = require('https');
      
      // Create axios instance with SSL configuration for HTTPS sites
      const axiosInstance = axios.create({
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certificates
          secureProtocol: 'TLSv1_2_method'
        })
      });

      // Test connection with WooCommerce API
      const apiUrl = wooSettings.woocommerce_api_url.replace(/\/$/, '');
      const testUrl = `${apiUrl}/wp-json/wc/v3/system_status`;
      
      const response = await axiosInstance.get(testUrl, {
        auth: {
          username: wooSettings.woocommerce_consumer_key,
          password: wooSettings.woocommerce_consumer_secret
        },
        headers: {
          'User-Agent': 'OtoParcaPanel/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.status === 200) {
        return {
          success: true,
          message: 'WooCommerce connection successful',
          api_url: wooSettings.woocommerce_api_url,
          version: response.data?.environment?.version || 'Unknown'
        };
      } else {
        return {
          success: false,
          message: `Connection failed with status: ${response.status}`,
          api_url: wooSettings.woocommerce_api_url
        };
      }
    } catch (error) {
      // Try alternative endpoint if system_status fails
      try {
        const axios = require('axios');
        const https = require('https');
        
        const axiosInstance = axios.create({
          timeout: 10000,
          httpsAgent: new https.Agent({
            rejectUnauthorized: false,
            secureProtocol: 'TLSv1_2_method'
          })
        });

        const apiUrl = wooSettings.woocommerce_api_url.replace(/\/$/, '');
        const testUrl = `${apiUrl}/wp-json/wc/v3/products`;
        
        const response = await axiosInstance.get(testUrl, {
          auth: {
            username: wooSettings.woocommerce_consumer_key,
            password: wooSettings.woocommerce_consumer_secret
          },
          params: {
            per_page: 1
          },
          headers: {
            'User-Agent': 'OtoParcaPanel/1.0',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200) {
          return {
            success: true,
            message: 'WooCommerce connection successful (products endpoint)',
            api_url: wooSettings.woocommerce_api_url
          };
        }
      } catch (altError) {
        // Both endpoints failed
      }

      return {
        success: false,
        message: `Connection failed: ${error.response?.data?.message || error.message}`,
        api_url: wooSettings.woocommerce_api_url,
        error_details: {
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code
        }
      };
    }
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
