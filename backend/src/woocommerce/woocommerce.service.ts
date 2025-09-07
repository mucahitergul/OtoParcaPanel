import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
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
  tags: Array<{ id: number; name: string; slug: string }>;
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
    @Inject(forwardRef(() => SettingsService))
    private settingsService: SettingsService,
  ) {
    this.initializeConfig();
    // Default config
    this.config = {
      url: 'https://example.com',
      consumerKey: '',
      consumerSecret: '',
    };
    // Initialize axios instance
    this.setupAxiosInstance();
  }

  private async initializeConfig() {
    try {
      const settings = await this.settingsService.getWooCommerceSettings();
      if (settings.woocommerce_api_url && settings.woocommerce_consumer_key && settings.woocommerce_consumer_secret) {
        this.config = {
          url: settings.woocommerce_api_url,
          consumerKey: settings.woocommerce_consumer_key,
          consumerSecret: settings.woocommerce_consumer_secret,
        };
        this.setupAxiosInstance();
      }
    } catch (error) {
      this.logger.warn('Could not load WooCommerce settings from database:', error.message);
      // Keep default config
    }

    this.setupAxiosInstance();
  }

  /**
   * Reload configuration from settings
   */
  async reloadConfig() {
    await this.initializeConfig();
  }

  private setupAxiosInstance() {
    const https = require('https');
    
    this.axiosInstance = axios.create({
      baseURL: `${this.config.url}/wp-json/wc/v3`,
      auth: {
        username: this.config.consumerKey,
        password: this.config.consumerSecret,
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OtoParcaPanel/1.0',
      },
      ...(this.config.url.startsWith('https') && {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false, // Allow self-signed certificates
          secureProtocol: 'TLSv1_2_method'
        })
      })
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        this.logger.debug(`WooCommerce API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('WooCommerce API Request Error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.logger.debug(`WooCommerce API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        this.logger.error(`WooCommerce API Error: ${error.response?.status} ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Test WooCommerce connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Ensure config is initialized
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly');
        return false;
      }

      // Validate that we have proper credentials
      if (!this.config.consumerKey || !this.config.consumerSecret || this.config.url === 'https://example.com') {
        this.logger.error('WooCommerce credentials are not properly configured');
        return false;
      }

      // Test with a simple API call
      const response = await this.axiosInstance.get('/products', {
        params: {
          per_page: 1,
          page: 1,
        },
      });

      if (response.status === 200) {
        this.logger.log('WooCommerce connection test successful');
        return true;
      } else {
        this.logger.error(`WooCommerce connection test failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.logger.error('WooCommerce connection test failed:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Get all products with pagination
   */
  async getAllProducts(page = 1, perPage = 100): Promise<WooCommerceProduct[]> {
    try {
      // Ensure config is initialized
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly');
        return [];
      }

      const response = await this.axiosInstance.get('/products', {
        params: {
          per_page: perPage,
          page: page,
          status: 'publish',
        },
      });

      this.logger.log(`Retrieved ${response.data.length} products from WooCommerce (page ${page})`);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching products from WooCommerce:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      return [];
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: number): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const response = await this.axiosInstance.get(`/products/${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching product ${productId} from WooCommerce:`, error.message);
      throw error;
    }
  }

  /**
   * Get products by SKU
   */
  async getProductBySku(sku: string): Promise<WooCommerceProduct[]> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly');
        return [];
      }

      const response = await this.axiosInstance.get('/products', {
        params: {
          sku: sku,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching product with SKU ${sku} from WooCommerce:`, error.message);
      return [];
    }
  }

  /**
   * Get products with pagination info
   */
  async getProductsWithPagination(page = 1, perPage = 100) {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly');
        return {
          products: [],
          totalPages: 0,
          totalProducts: 0,
          currentPage: page,
          perPage: perPage,
        };
      }

      const response = await this.axiosInstance.get('/products', {
        params: {
          per_page: perPage,
          page: page,
          status: 'publish',
        },
      });

      const totalProducts = parseInt(response.headers['x-wp-total'] || '0');
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0');

      return {
        products: response.data,
        totalPages,
        totalProducts,
        currentPage: page,
        perPage: perPage,
      };
    } catch (error) {
      this.logger.error('Error fetching products with pagination from WooCommerce:', error.message);
      return {
        products: [],
        totalPages: 0,
        totalProducts: 0,
        currentPage: page,
        perPage: perPage,
      };
    }
  }

  /**
   * Update product stock
   */
  async updateProductStock(
    productId: number,
    stockQuantity: number,
    stockStatus?: string,
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const updateData: any = {
        stock_quantity: stockQuantity,
        manage_stock: true,
      };

      if (stockStatus) {
        updateData.stock_status = stockStatus;
      }

      const response = await this.axiosInstance.put(`/products/${productId}`, updateData);
      this.logger.log(`Updated stock for product ${productId}: ${stockQuantity}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating stock for product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update product price
   */
  async updateProductPrice(
    productId: number,
    price: string | number,
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const updateData = {
        regular_price: price.toString(),
        price: price.toString(),
      };

      const response = await this.axiosInstance.put(`/products/${productId}`, updateData);
      this.logger.log(`Updated price for product ${productId}: ${price}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating price for product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update product with custom data
   */
  async updateProduct(
    productId: number,
    updateData: {
      name?: string;
      sku?: string;
      price?: string;
      regular_price?: string;
      sale_price?: string;
      stock_quantity?: number;
      manage_stock?: boolean;
      stock_status?: 'instock' | 'outofstock' | 'onbackorder';
      description?: string;
      short_description?: string;
      categories?: Array<{ id: number }>;
      images?: Array<{ src: string; alt?: string }>;
    },
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const response = await this.axiosInstance.put(`/products/${productId}`, updateData);
      this.logger.log(`Updated product ${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update product tags
   */
  async updateProductTags(
    productId: number,
    tags: string[],
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const tagObjects = tags.map(tag => ({ name: tag }));
      
      const updateData = {
        tags: tagObjects,
      };

      const response = await this.axiosInstance.put(`/products/${productId}`, updateData);
      this.logger.log(`Updated tags for product ${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error updating tags for product ${productId}:`, error.message);
      throw error;
    }
  }

  /**
   * Bulk update products
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
      name?: string;
      sku?: string;
    }>,
  ): Promise<WooCommerceProduct[]> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        throw new Error('WooCommerce not configured properly');
      }

      const response = await this.axiosInstance.post('/products/batch', {
        update: updates,
      });
      
      this.logger.log(`Bulk updated ${updates.length} products`);
      return response.data.update || [];
    } catch (error) {
      this.logger.error('Error bulk updating products:', error.message);
      throw error;
    }
  }

  /**
   * Sync product with calculated price
   */
  async syncProductWithCalculatedPrice(
    productId: number,
    calculatedPrice: number,
    stockQuantity: number,
  ): Promise<WooCommerceProduct> {
    try {
      const updateData = {
        regular_price: calculatedPrice.toString(),
        price: calculatedPrice.toString(),
        stock_quantity: stockQuantity,
        manage_stock: true,
        stock_status: (stockQuantity > 0 ? 'instock' : 'outofstock') as 'instock' | 'outofstock' | 'onbackorder',
      };

      return await this.updateProduct(productId, updateData);
    } catch (error) {
      this.logger.error(`Error syncing product ${productId} with calculated price:`, error.message);
      throw error;
    }
  }

  /**
   * Get products that need sync (placeholder implementation)
   */
  async getProductsNeedingSync(): Promise<WooCommerceProduct[]> {
    try {
      // This is a placeholder implementation
      // In a real scenario, you might want to compare with your local database
      // and return products that have different prices or stock levels
      
      const products = await this.getAllProducts(1, 50);
      
      // For now, return all products as needing sync
      // You can implement your own logic here
      return products;
    } catch (error) {
      this.logger.error('Error getting products needing sync:', error.message);
      return [];
    }
  }

  /**
   * Update config from settings service
   */
  async updateConfigFromSettings(): Promise<void> {
    try {
      const settings = await this.settingsService.getWooCommerceSettings();
      
      if (settings.woocommerce_api_url && settings.woocommerce_consumer_key && settings.woocommerce_consumer_secret) {
        this.config = {
          url: settings.woocommerce_api_url,
          consumerKey: settings.woocommerce_consumer_key,
          consumerSecret: settings.woocommerce_consumer_secret,
        };
        
        this.setupAxiosInstance();
        this.logger.log('WooCommerce configuration updated from settings');
      } else {
        this.logger.warn('WooCommerce settings are incomplete');
      }
    } catch (error) {
      this.logger.error('Error updating WooCommerce config from settings:', error.message);
      throw error;
    }
  }

  /**
   * Check if product exists
   */
  async checkProductExists(productId: number): Promise<boolean> {
    try {
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly, cannot check product existence');
        throw new Error('WooCommerce configuration is missing');
      }

      if (!this.config.consumerKey || !this.config.consumerSecret || this.config.url === 'https://example.com') {
        this.logger.error('WooCommerce credentials are not properly configured');
        throw new Error('WooCommerce credentials are missing or invalid');
      }

      const response = await this.axiosInstance.get(`/products/${productId}`);
      return response.status === 200;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      
      if (error.message.includes('configuration') || error.message.includes('credentials')) {
        throw error;
      }
      
      this.logger.warn(`Error checking product ${productId} existence: ${error.message}`);
      return false;
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
