import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SettingsService } from '../settings/settings.service';

export interface WooCommerceProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number;
  manage_stock: boolean;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  categories: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; alt: string }>;
  date_created: string;
  date_modified: string;
}

export interface WooCommerceConfig {
  url: string;
  consumerKey: string;
  consumerSecret: string;
}

@Injectable()
export class WooCommerceService {
  private readonly logger = new Logger(WooCommerceService.name);
  private axiosInstance: any;
  private config: WooCommerceConfig;

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
  ) {
    this.initializeConfig();
  }

  private async initializeConfig() {
    try {
      // Try to get settings from database first, fallback to env variables
      const wooSettings = await this.settingsService.getWooCommerceSettings();
      this.config = {
        url:
          wooSettings.url ||
          this.configService.get<string>(
            'WOOCOMMERCE_URL',
            'https://example.com',
          ),
        consumerKey:
          wooSettings.consumer_key ||
          this.configService.get<string>('WOOCOMMERCE_CONSUMER_KEY', ''),
        consumerSecret:
          wooSettings.consumer_secret ||
          this.configService.get<string>('WOOCOMMERCE_CONSUMER_SECRET', ''),
      };
    } catch (error) {
      // Fallback to env variables if settings service is not available
      this.config = {
        url: this.configService.get<string>(
          'WOOCOMMERCE_URL',
          'https://example.com',
        ),
        consumerKey: this.configService.get<string>(
          'WOOCOMMERCE_CONSUMER_KEY',
          '',
        ),
        consumerSecret: this.configService.get<string>(
          'WOOCOMMERCE_CONSUMER_SECRET',
          '',
        ),
      };
    }

    this.setupAxiosInstance();
  }

  private setupAxiosInstance() {
    this.axiosInstance = axios.create({
      baseURL: `${this.config.url}/wp-json/wc/v3`,
      auth: {
        username: this.config.consumerKey,
        password: this.config.consumerSecret,
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`Making request to: ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response received from: ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(
          'Response error:',
          error.response?.data || error.message,
        );
        return Promise.reject(error);
      },
    );
  }

  /**
   * Test WooCommerce API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/system_status');
      this.logger.log('WooCommerce connection test successful');
      return response.status === 200;
    } catch (error) {
      this.logger.error('WooCommerce connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get all products from WooCommerce
   */
  async getAllProducts(page = 1, perPage = 100): Promise<WooCommerceProduct[]> {
    try {
      const response = await this.axiosInstance.get('/products', {
        params: {
          page,
          per_page: perPage,
          status: 'publish',
        },
      });

      this.logger.log(
        `Fetched ${response.data.length} products from WooCommerce`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Error fetching products from WooCommerce:',
        error.message,
      );
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Get a specific product by ID
   */
  async getProductById(productId: number): Promise<WooCommerceProduct> {
    try {
      const response = await this.axiosInstance.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching product ${productId}:`, error.message);
      throw new Error(`Failed to fetch product ${productId}: ${error.message}`);
    }
  }

  /**
   * Get products by SKU
   */
  async getProductBySku(sku: string): Promise<WooCommerceProduct[]> {
    try {
      const response = await this.axiosInstance.get('/products', {
        params: {
          sku,
          status: 'publish',
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error fetching product with SKU ${sku}:`,
        error.message,
      );
      throw new Error(
        `Failed to fetch product with SKU ${sku}: ${error.message}`,
      );
    }
  }

  /**
   * Get products with pagination info
   */
  async getProductsWithPagination(page = 1, perPage = 100) {
    try {
      const response = await this.axiosInstance.get('/products', {
        params: {
          page,
          per_page: perPage,
          status: 'publish',
        },
      });

      const totalProducts = parseInt(response.headers['x-wp-total'] || '0');
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0');

      return {
        products: response.data,
        pagination: {
          currentPage: page,
          perPage,
          totalProducts,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        'Error fetching products with pagination:',
        error.message,
      );
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Update product stock in WooCommerce
   */
  async updateProductStock(
    productId: number,
    stockQuantity: number,
  ): Promise<WooCommerceProduct> {
    try {
      const response = await this.axiosInstance.put(`/products/${productId}`, {
        stock_quantity: stockQuantity,
        manage_stock: true,
        stock_status: stockQuantity > 0 ? 'instock' : 'outofstock',
      });

      this.logger.log(
        `Updated stock for product ${productId} to ${stockQuantity}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error updating stock for product ${productId}:`,
        error.message,
      );
      throw new Error(`Failed to update stock: ${error.message}`);
    }
  }

  /**
   * Update product price in WooCommerce
   */
  async updateProductPrice(
    productId: number,
    price: string,
  ): Promise<WooCommerceProduct> {
    try {
      const response = await this.axiosInstance.put(`/products/${productId}`, {
        regular_price: price,
        price: price,
      });

      this.logger.log(`Updated price for product ${productId} to ${price}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error updating price for product ${productId}:`,
        error.message,
      );
      throw new Error(`Failed to update price: ${error.message}`);
    }
  }

  /**
   * Update multiple products in bulk
   */
  async updateProductsBulk(
    updates: Array<{
      id: number;
      stock_quantity?: number;
      price?: string;
      regular_price?: string;
      sale_price?: string;
      manage_stock?: boolean;
      stock_status?: 'instock' | 'outofstock' | 'onbackorder';
    }>,
  ): Promise<WooCommerceProduct[]> {
    try {
      const response = await this.axiosInstance.post('/products/batch', {
        update: updates,
      });

      this.logger.log(`Bulk updated ${updates.length} products`);
      return response.data.update;
    } catch (error) {
      this.logger.error('Error bulk updating products:', error.message);
      throw new Error(`Failed to bulk update products: ${error.message}`);
    }
  }

  /**
   * Sync product data with calculated prices
   */
  async syncProductWithCalculatedPrice(
    productId: number,
    calculatedPrice: number,
    stockQuantity: number,
  ): Promise<WooCommerceProduct> {
    try {
      const response = await this.axiosInstance.put(`/products/${productId}`, {
        regular_price: calculatedPrice.toString(),
        price: calculatedPrice.toString(),
        stock_quantity: stockQuantity,
        manage_stock: true,
        stock_status: stockQuantity > 0 ? 'instock' : 'outofstock',
      });

      this.logger.log(
        `Synced product ${productId} with calculated price ${calculatedPrice}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error syncing product ${productId}:`, error.message);
      throw new Error(`Failed to sync product ${productId}: ${error.message}`);
    }
  }

  /**
   * Get products that need synchronization
   */
  async getProductsNeedingSync(): Promise<WooCommerceProduct[]> {
    try {
      const response = await this.axiosInstance.get('/products', {
        params: {
          status: 'publish',
          per_page: 100,
          meta_key: 'needs_sync',
          meta_value: 'true',
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Error fetching products needing sync:', error.message);
      throw new Error(
        `Failed to fetch products needing sync: ${error.message}`,
      );
    }
  }

  /**
   * Update configuration from settings
   */
  async updateConfigFromSettings(): Promise<void> {
    try {
      const wooSettings = await this.settingsService.getWooCommerceSettings();
      this.config = {
        url: wooSettings.url,
        consumerKey: wooSettings.consumer_key,
        consumerSecret: wooSettings.consumer_secret,
      };
      this.setupAxiosInstance();
      this.logger.log('WooCommerce configuration updated from settings');
    } catch (error) {
      this.logger.error('Error updating WooCommerce config:', error.message);
      throw new Error(`Failed to update WooCommerce config: ${error.message}`);
    }
  }

  /**
   * Get WooCommerce configuration status
   */
  getConfigStatus() {
    return {
      url: this.config.url,
      hasConsumerKey: !!this.config.consumerKey,
      hasConsumerSecret: !!this.config.consumerSecret,
      isConfigured: !!(
        this.config.url &&
        this.config.consumerKey &&
        this.config.consumerSecret
      ),
    };
  }
}
