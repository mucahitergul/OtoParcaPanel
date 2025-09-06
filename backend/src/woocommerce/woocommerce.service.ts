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
  }

  private async initializeConfig() {
    try {
      // Get settings from database only
      const wooSettings = await this.settingsService.getWooCommerceSettings();
      this.config = {
        url: wooSettings.woocommerce_api_url || 'https://example.com',
        consumerKey: wooSettings.woocommerce_consumer_key || '',
        consumerSecret: wooSettings.woocommerce_consumer_secret || '',
      };
      this.logger.log('WooCommerce configuration loaded from database');
    } catch (error) {
      this.logger.warn('Failed to load WooCommerce settings from database, using defaults');
      this.config = {
        url: 'https://example.com',
        consumerKey: '',
        consumerSecret: '',
      };
    }

    this.setupAxiosInstance();
  }

  /**
   * Reload configuration from database
   */
  async reloadConfig() {
    await this.initializeConfig();
    this.logger.log('WooCommerce configuration reloaded');
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
      // Ensure config is loaded
      await this.initializeConfig();
      
      // Check if config is properly set
      if (!this.config || !this.config.url || !this.config.consumerKey || !this.config.consumerSecret) {
        this.logger.error('WooCommerce configuration is incomplete');
        return false;
      }

      // Check if axiosInstance is available
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce axios instance not initialized');
        return false;
      }

      // Try to get a simple endpoint first (products with limit 1)
      const response = await this.axiosInstance.get('/products', {
        params: {
          per_page: 1,
          status: 'any'
        },
        timeout: 10000
      });
      
      this.logger.log('WooCommerce connection test successful');
      return response.status === 200;
    } catch (error) {
      this.logger.error('WooCommerce connection test failed:', error.message);
      
      // Try alternative endpoint if products fails
      try {
        const response = await this.axiosInstance.get('/data/countries');
        this.logger.log('WooCommerce connection test successful (alternative endpoint)');
        return response.status === 200;
      } catch (altError) {
        this.logger.error('WooCommerce alternative connection test also failed:', altError.message);
        return false;
      }
    }
  }

  /**
   * Get all products from WooCommerce
   */
  async getAllProducts(page = 1, perPage = 100): Promise<WooCommerceProduct[]> {
    try {
      // Ensure config is loaded
      await this.initializeConfig();
      
      // Check if axiosInstance is available
      if (!this.axiosInstance) {
        throw new Error('WooCommerce axios instance not initialized');
      }
      
      const response = await this.axiosInstance.get('/products', {
        params: {
          page,
          per_page: perPage,
          status: 'publish',
          // Explicitly request tags and categories to be included
          _fields: 'id,name,sku,price,regular_price,sale_price,stock_quantity,manage_stock,stock_status,categories,images,tags,date_created,date_modified'
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
      const response = await this.axiosInstance.get(`/products/${productId}`, {
        params: {
          _embed: true, // Include tags and other embedded data
        },
      });
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
          _embed: true, // Include tags and other embedded data
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
          _embed: true, // Include tags and other embedded data
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
    stockStatus?: string,
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      if (!this.axiosInstance) {
        throw new Error('WooCommerce configuration not available');
      }

      const response = await this.axiosInstance.put(`/products/${productId}`, {
        stock_quantity: stockQuantity,
        manage_stock: true,
        stock_status: stockStatus || (stockQuantity > 0 ? 'instock' : 'outofstock'),
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
    price: string | number,
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      if (!this.axiosInstance) {
        throw new Error('WooCommerce configuration not available');
      }

      const priceStr = price.toString();
      const response = await this.axiosInstance.put(`/products/${productId}`, {
        regular_price: priceStr,
      });

      this.logger.log(`Updated price for product ${productId} to ${priceStr}`);
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
   * Update a single product with comprehensive data
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
        throw new Error('WooCommerce configuration not available');
      }

      // Filter out undefined values
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      this.logger.log(`Updating WooCommerce product ${productId} with data:`, cleanUpdateData);

      const response = await this.axiosInstance.put(`/products/${productId}`, cleanUpdateData);

      this.logger.log(`Successfully updated WooCommerce product ${productId}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error updating WooCommerce product ${productId}:`,
        error.response?.data || error.message,
      );
      throw new Error(`Failed to update product ${productId}: ${error.message}`);
    }
  }

  /**
   * Update product tags in WooCommerce
   */
  async updateProductTags(
    productId: number,
    tags: string[],
  ): Promise<WooCommerceProduct> {
    try {
      await this.initializeConfig();
      if (!this.axiosInstance) {
        throw new Error('WooCommerce configuration not available');
      }

      // Convert supplier names to tag objects for WooCommerce
      const tagObjects = tags.map(tag => ({ name: tag }));

      const response = await this.axiosInstance.put(`/products/${productId}`, {
        tags: tagObjects,
      });

      this.logger.log(
        `Updated tags for product ${productId}: [${tags.join(', ')}]`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Error updating tags for product ${productId}:`,
        error.response?.data || error.message,
      );
      throw new Error(`Failed to update tags for product ${productId}: ${error.message}`);
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
      name?: string;
      sku?: string;
    }>,
  ): Promise<WooCommerceProduct[]> {
    try {
      await this.initializeConfig();
      if (!this.axiosInstance) {
        throw new Error('WooCommerce configuration not available');
      }

      this.logger.log(`Bulk updating ${updates.length} WooCommerce products`);

      const response = await this.axiosInstance.post('/products/batch', {
        update: updates,
      });

      this.logger.log(`Successfully bulk updated ${updates.length} products`);
      return response.data.update;
    } catch (error) {
      this.logger.error('Error bulk updating products:', error.response?.data || error.message);
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
        url: wooSettings.woocommerce_api_url || 'https://example.com',
        consumerKey: wooSettings.woocommerce_consumer_key || '',
        consumerSecret: wooSettings.woocommerce_consumer_secret || '',
      };
      this.setupAxiosInstance();
      this.logger.log('WooCommerce configuration updated from settings');
    } catch (error) {
      this.logger.error('Error updating WooCommerce config:', error.message);
      throw new Error(`Failed to update WooCommerce config: ${error.message}`);
    }
  }

  /**
   * Check if a product exists in WooCommerce
   */
  async checkProductExists(productId: number): Promise<boolean> {
    try {
      // Ensure config is initialized
      await this.initializeConfig();
      
      if (!this.axiosInstance) {
        this.logger.error('WooCommerce not configured properly, cannot check product existence');
        throw new Error('WooCommerce configuration is missing');
      }

      // Validate that we have proper credentials
      if (!this.config.consumerKey || !this.config.consumerSecret || this.config.url === 'https://example.com') {
        this.logger.error('WooCommerce credentials are not properly configured');
        throw new Error('WooCommerce credentials are missing or invalid');
      }

      const response = await this.axiosInstance.get(`/products/${productId}`);
      return response.status === 200;
    } catch (error) {
      if (error.response?.status === 404) {
        // Product not found
        return false;
      }
      
      // For configuration errors, throw them so the calling function can handle
      if (error.message.includes('configuration') || error.message.includes('credentials')) {
        throw error;
      }
      
      // Log other errors but don't throw
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
