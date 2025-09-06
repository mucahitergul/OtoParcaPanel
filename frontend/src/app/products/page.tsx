'use client';

import { useState, useEffect } from 'react';
import { productApi } from '@/lib/api';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  AlertTriangle,
  Eye,
  Plus,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  BarChart3,
  X
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import AdvancedFilters from '@/components/AdvancedFilters';
import BulkActions from '@/components/BulkActions';
import SyncProgressModal from '@/components/SyncProgressModal';
import AdvancedPagination from '@/components/AdvancedPagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: number;
  woo_product_id?: number;
  stok_kodu: string;
  urun_adi: string;
  stok_miktari: number;
  regular_price: number;
  sale_price?: number;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  categories?: Array<{ id: number; name: string; slug: string }>;
  images?: Array<{ id: number; src: string; alt: string }>;
  last_sync_date?: string;
  sync_required: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductsResponse {
  success: boolean;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Statistics {
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  needsSyncProducts: number;
  recentUpdates: number;
  stockPercentage: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'updated'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    stockStatus: '' as '' | 'instock' | 'outofstock' | 'onbackorder',
    priceRange: { min: '' as number | '', max: '' as number | '' },
    stockRange: { min: '' as number | '', max: '' as number | '' },
    dateRange: { from: '', to: '' },
    categories: [] as string[],
    needsSync: false,
    hasImages: null as boolean | null,
    sortBy: 'updated' as 'name' | 'price' | 'stock' | 'updated' | 'created',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [fetchingFromWoo, setFetchingFromWoo] = useState(false);
  
  // WooCommerce sync progress states
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [syncStats, setSyncStats] = useState({ successful: 0, failed: 0 });
  const [syncCompleted, setSyncCompleted] = useState(false);
  const [currentSyncingProduct, setCurrentSyncingProduct] = useState<string | null>(null);
  
  // Batch sync states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  
  // Delete all products states
  const [deletingAllProducts, setDeletingAllProducts] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProducts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search,
        stockStatus: filters.stockStatus || undefined,
        needsSync: filters.needsSync
      });
      
      if (response.data.success) {
        setProducts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error('Ürünler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await productApi.getStatistics();
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('İstatistikler yüklenirken hata:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncCompleted(false);
      setSyncProgress({ current: 0, total: 0, success: 0, failed: 0 });
      setSyncStats({ successful: 0, failed: 0 });
      setCurrentSyncingProduct(null);
      
      // Get all products that need sync from backend (not limited by pagination)
      const needsSyncResponse = await productApi.getProductsNeedingSync();
      
      if (!needsSyncResponse.data.success || needsSyncResponse.data.data.length === 0) {
        toast.info('Senkronize edilecek ürün bulunamadı');
        setSyncing(false);
        return;
      }
      
      const productsNeedingSync = needsSyncResponse.data.data;
      
      // Show initial loading toast
      const loadingToast = toast.loading(`${productsNeedingSync.length} ürün senkronize ediliyor...`);
      
      // Set total count for products that need sync
      setSyncProgress(prev => ({ ...prev, total: productsNeedingSync.length }));
      
      // Process products one by one for real-time tracking
      let successCount = 0;
      let failCount = 0;
      
      for (let i = 0; i < productsNeedingSync.length; i++) {
        const product = productsNeedingSync[i];
        setCurrentSyncingProduct(product.urun_adi);
        
        try {
          // Sync individual product
          const result = await productApi.syncSingleProduct(product.id);
          
          if (result.data?.success) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to sync product ${product.urun_adi}:`, result);
          }
        } catch (error) {
          failCount++;
          console.error(`Error syncing product ${product.urun_adi}:`, error);
        }
        
        // Update progress
        setSyncProgress({
          current: i + 1,
          total: productsNeedingSync.length,
          success: successCount,
          failed: failCount
        });
        
        setSyncStats({ successful: successCount, failed: failCount });
        
        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      // Final completion
      setCurrentSyncingProduct(null);
      setSyncCompleted(true);
      
      if (failCount === 0) {
        toast.success(
          `🎉 Senkronizasyon tamamlandı! ${successCount} ürün başarıyla güncellendi.`,
          { duration: 5000 }
        );
      } else {
        toast.warning(
          `⚠️ Senkronizasyon tamamlandı: ${successCount} başarılı, ${failCount} hata`,
          { duration: 7000 }
        );
      }
      
      fetchProducts();
      fetchStatistics();
    } catch (error: any) {
      console.error('Sync error:', error);
      
      let errorMessage = 'Senkronizasyon sırasında beklenmeyen bir hata oluştu';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check for specific error types
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
        errorMessage = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Yetkilendirme hatası. Lütfen tekrar giriş yapın.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      }
      
      toast.error(`💥 ${errorMessage}`, { duration: 8000 });
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchFromWooCommerce = async () => {
    try {
      setFetchingFromWoo(true);
      
      // Get token from storage
      const token = sessionStorage.getItem('auth_token') || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/woocommerce/sync-products-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          batchSize: 100,
          forceUpdate: true
        })
      });
      
      const result = await response.json();
      if (result.success && result.data.syncId) {
        setCurrentSyncId(result.data.syncId);
        setShowSyncModal(true);
        toast.success('Toplu senkronizasyon başlatıldı');
      } else {
        toast.error(result.message || 'WooCommerce bağlantısında hata oluştu');
      }
    } catch (error) {
      toast.error('WooCommerce bağlantısında hata oluştu');
    } finally {
      setFetchingFromWoo(false);
    }
  };

  const handleDeleteAllProducts = async () => {
    try {
      setDeletingAllProducts(true);
      setDeleteProgress({ current: 0, total: statistics?.totalProducts || 0 });
      
      const loadingToast = toast.loading(`${statistics?.totalProducts || 0} ürün siliniyor...`);
      
      const response = await productApi.deleteAllProducts();
      
      toast.dismiss(loadingToast);
      
      if (response.data.success) {
        toast.success(`🎉 Tüm ürünler başarıyla silindi! ${response.data.deletedCount} ürün kaldırıldı.`, {
          duration: 5000
        });
        
        // Refresh data
        await fetchProducts();
        await fetchStatistics();
        setSelectedProducts([]);
      } else {
        toast.error('Ürünler silinirken hata oluştu');
      }
    } catch (error: any) {
      console.error('Delete all products error:', error);
      
      let errorMessage = 'Ürünler silinirken beklenmeyen bir hata oluştu';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`💥 ${errorMessage}`, { duration: 8000 });
    } finally {
      setDeletingAllProducts(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCloseSyncModal = () => {
    setShowSyncModal(false);
    setCurrentSyncId(null);
    // Refresh data when modal is closed
    fetchProducts();
    fetchStatistics();
  };

  const handleBulkAction = async (action: 'sync' | 'delete') => {
    if (selectedProducts.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    try {
      if (action === 'sync') {
        const response = await productApi.bulkSync(selectedProducts);
        if (response.data.success) {
          toast.success(`${selectedProducts.length} ürün senkronize edildi`);
        } else {
          toast.error('Senkronizasyon sırasında hata oluştu');
        }
      } else if (action === 'delete') {
        const response = await productApi.bulkDelete(selectedProducts);
        if (response.data.success) {
          toast.success(`${selectedProducts.length} ürün kalıcı olarak silindi`);
        } else {
          toast.error('Silme işlemi sırasında hata oluştu');
        }
      }
      setSelectedProducts([]);
      fetchProducts();
      fetchStatistics();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('İşlem sırasında hata oluştu');
    }
  };


  
  // Handle sync modal close
  const handleSyncModalClose = () => {
    setShowSyncModal(false);
    setCurrentSyncId(null);
    fetchProducts();
    fetchStatistics();
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAllProducts = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'instock':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400';
      case 'outofstock':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400';
      case 'onbackorder':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'instock':
        return 'Stokta';
      case 'outofstock':
        return 'Stok Yok';
      case 'onbackorder':
        return 'Ön Sipariş';
      default:
        return 'Bilinmiyor';
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStatistics();
  }, [pagination.page, pagination.limit, filters.search, filters.stockStatus, filters.needsSync]);

  const StatCard = ({ title, value, icon: Icon, change, changeType, color }: {
    title: string;
    value: string | number;
    icon: any;
    change?: string;
    changeType?: 'increase' | 'decrease';
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? '↗' : '↘'} {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <AdvancedFilters
          filters={filters}
          isOpen={showAdvancedFilters}
          onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
          onFiltersChange={(advancedFilters) => {
            console.log('Advanced filters:', advancedFilters);
            setFilters(advancedFilters);
          }}
          onApplyFilters={() => {
            fetchProducts();
          }}
          onResetFilters={() => {
             setFilters({
               search: '',
               stockStatus: '',
               priceRange: { min: '', max: '' },
               stockRange: { min: '', max: '' },
               dateRange: { from: '', to: '' },
               categories: [],
               needsSync: false,
               hasImages: null,
               sortBy: 'updated',
               sortOrder: 'desc'
             });
             fetchProducts();
           }}
        />
      )}

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <BulkActions
          selectedItems={selectedProducts}
          totalItems={products.length}
          onSelectAll={toggleAllProducts}
          onDeselectAll={() => setSelectedProducts([])}
          onBulkSync={async (ids) => {
            try {
              await productApi.bulkSync(ids);
              await fetchProducts();
            } catch (error) {
              console.error('Bulk sync error:', error);
              throw error;
            }
          }}
          onBulkDelete={async (ids) => {
            try {
              await productApi.bulkDelete(ids);
              setSelectedProducts([]);
              await fetchProducts();
            } catch (error) {
              console.error('Bulk delete error:', error);
              throw error;
            }
          }}
          onBulkPriceUpdate={async (ids, price) => {
            try {
              await productApi.bulkPriceUpdate(ids, 'fixed', price);
              await fetchProducts();
            } catch (error) {
              console.error('Bulk price update error:', error);
              throw error;
            }
          }}
          onBulkStockUpdate={async (ids, stock) => {
            try {
              await productApi.bulkStockUpdate(ids, 'fixed', stock);
              await fetchProducts();
            } catch (error) {
              console.error('Bulk stock update error:', error);
              throw error;
            }
          }}
          onBulkExport={async (ids, format) => {
            try {
              const defaultFields = ['stok_kodu', 'urun_adi', 'fiyat', 'stok_miktari', 'stock_status', 'kategori'];
              await productApi.bulkExport(ids, format, defaultFields);
            } catch (error) {
              console.error('Bulk export error:', error);
              throw error;
            }
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ürün Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400">WooCommerce ürünlerinizi yönetin ve senkronize edin</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleFetchFromWooCommerce}
            disabled={fetchingFromWoo}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {fetchingFromWoo ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            {fetchingFromWoo ? 'Çekiliyor...' : 'WooCommerce\'den Ürün Çek'}
          </button>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {syncing ? 'Senkronize Ediliyor...' : 'Senkronize Et'}
          </button>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deletingAllProducts || !statistics?.totalProducts}
              className="flex items-center gap-2 px-3 py-2 bg-red-700 text-white text-sm rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Tüm ürünleri kalıcı olarak sil"
            >
              {deletingAllProducts ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {deletingAllProducts ? 'Siliniyor...' : 'Tüm Ürünleri Sil'}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Toplam Ürün"
            value={statistics.totalProducts}
            icon={Package}
            color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
          />
          <StatCard
            title="Stokta Olan"
            value={statistics.inStockProducts}
            icon={CheckCircle}
            change={`%${statistics.stockPercentage.toFixed(1)}`}
            changeType="increase"
            color="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          />
          <StatCard
            title="Stokta Olmayan"
            value={statistics.outOfStockProducts}
            icon={XCircle}
            color="bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"
          />
          <StatCard
            title="Senkron Gerekli"
            value={statistics.needsSyncProducts}
            icon={Clock}
            color="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
          />
        </div>
      )}

      {/* WooCommerce Sync Progress */}
      {(syncing || syncCompleted) && (
        <Card className="border-blue-800 bg-gradient-to-r from-blue-800 to-blue-900">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {syncing ? (
                    <RefreshCw className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-white" />
                  )}
                  <span className="text-sm font-semibold text-white">
                    {syncing ? 'WooCommerce Senkronizasyon İlerlemesi' : 'WooCommerce Senkronizasyonu Tamamlandı'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 dark:border-white">
                    {syncProgress.current} / {syncProgress.total}
                  </Badge>
                  {syncCompleted && (
                    <button
                      onClick={() => setSyncCompleted(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-white/30 rounded-full h-3 shadow-inner">
                <div 
                  className="bg-white h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              {/* Success/Failure Stats */}
              <div className="flex items-center gap-4 p-3 rounded-lg" style={{backgroundColor: '#fff'}}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-800">
                    Başarılı: <span className="font-bold">{syncStats.successful}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-800">
                    Başarısız: <span className="font-bold">{syncStats.failed}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-800">
                    Toplam: <span className="font-bold">{syncStats.successful + syncStats.failed}</span>
                  </span>
                </div>
              </div>
              
              {currentSyncingProduct && syncing && (
                <div className="flex items-center gap-2 p-3 bg-blue-600 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-white animate-spin" />
                  <p className="text-sm text-white">
                    Senkronize ediliyor: <span className="font-semibold">{currentSyncingProduct}</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Ürün ara..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>
          </form>

          {/* Filters and View Mode Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filtreler
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value as any }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              <option value="">Tüm Stok Durumları</option>
              <option value="instock">Stokta</option>
              <option value="outofstock">Stok Yok</option>
              <option value="onbackorder">Ön Sipariş</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              <option value="updated">Güncelleme Tarihi</option>
              <option value="name">Ürün Adı</option>
              <option value="price">Fiyat</option>
              <option value="stock">Stok Miktarı</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={filters.needsSync}
              onChange={(e) => setFilters(prev => ({ ...prev, needsSync: e.target.checked }))}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            Sadece senkron gerekli olanlar
          </label>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Senkronize Ediliyor...' : 'Senkronize Et'}
            </button>
          </div>
        </div>
      </div>

      {/* Products Table/Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={toggleAllProducts}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ürün
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stok Kodu
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fiyat
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Güncelleme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                        <span className="ml-2 text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-500 dark:text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz ürün bulunmuyor</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          className="text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0].src}
                              alt={product.images[0].alt || product.urun_adi}
                              className="h-10 w-10 rounded-lg object-cover mr-3"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-3">
                              <Package className="h-5 w-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {product.urun_adi}
                            </div>
                            {product.sync_required && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400 mt-1">
                                <Clock className="h-3 w-3 mr-1" />
                                Senkron Gerekli
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {product.stok_kodu}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatPrice(product.regular_price)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 dark:text-white">{product.stok_miktari}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          getStockStatusColor(product.stock_status)
                        }`}>
                          {getStockStatusText(product.stock_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(product.updated_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/products/${product.id}`}
                            className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Yükleniyor...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">Henüz ürün bulunmuyor</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-700 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                    
                    <div className="text-center mb-4">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={product.images[0].src}
                          alt={product.images[0].alt || product.urun_adi}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center mb-3">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-2 line-clamp-2">
                        {product.urun_adi}
                      </h3>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span className="bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">
                          {product.stok_kodu}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStockStatusColor(product.stock_status)
                        }`}>
                          {getStockStatusText(product.stock_status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatPrice(product.regular_price)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Stok: {product.stok_miktari}
                        </span>
                      </div>
                      
                      {product.sync_required && (
                        <div className="flex items-center justify-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Senkron Gerekli
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {formatDate(product.updated_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Advanced Pagination */}
        {pagination.totalPages > 1 && (
          <AdvancedPagination
             currentPage={pagination.page}
             totalPages={pagination.totalPages}
             totalItems={pagination.total}
             itemsPerPage={pagination.limit}
             onPageChange={handlePageChange}
             onItemsPerPageChange={handleItemsPerPageChange}
             showPageSizeSelector={true}
             showJumpToPage={true}
             className="border-t border-gray-200 dark:border-gray-700"
           />
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Tüm Ürünleri Sil
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Bu işlem geri alınamaz!
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                <strong>{statistics?.totalProducts || 0}</strong> adet ürün kalıcı olarak silinecek.
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                ⚠️ Bu işlem geri alınamaz. Tüm ürün verileri kalıcı olarak kaybolacak.
              </p>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingAllProducts}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDeleteAllProducts}
                disabled={deletingAllProducts}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {deletingAllProducts ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Evet, Tümünü Sil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sync Progress Modal */}
      <SyncProgressModal
        isOpen={showSyncModal}
        onClose={handleCloseSyncModal}
        syncId={currentSyncId}
      />
    </div>
  );
}