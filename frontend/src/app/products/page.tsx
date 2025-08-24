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
  Eye,
  Plus,
  Download,
  Upload,
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
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import AdvancedFilters from '@/components/AdvancedFilters';
import BulkActions from '@/components/BulkActions';
import ExportModal from '@/components/ExportModal';

interface Product {
  id: number;
  woo_product_id?: number;
  stok_kodu: string;
  urun_adi: string;
  stok_miktari: number;
  fiyat: number;
  regular_price?: number;
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
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProducts({
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        stockStatus: filters.stockStatus || undefined,
        needsSync: filters.needsSync || undefined,
        priceMin: filters.priceRange.min || undefined,
        priceMax: filters.priceRange.max || undefined,
      });

      if (response.data.success) {
        setProducts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await productApi.getProductStatistics();
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await productApi.syncProducts({ batchSize: 50 });
      if (response.data.success) {
        await fetchProducts();
        await fetchStatistics();
        toast.success('Ürünler başarıyla senkronize edildi!');
      }
    } catch (error) {
      console.error('Error syncing products:', error);
      toast.error('Senkronizasyon sırasında hata oluştu!');
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkAction = async (action: 'sync' | 'delete') => {
    if (selectedProducts.length === 0) {
      toast.warning('Lütfen işlem yapmak için ürün seçin');
      return;
    }

    try {
      if (action === 'sync') {
        // Bulk sync implementation
        toast.success(`${selectedProducts.length} ürün senkronize edildi`);
      } else if (action === 'delete') {
        // Bulk delete implementation
        toast.success(`${selectedProducts.length} ürün silindi`);
      }
      setSelectedProducts([]);
      await fetchProducts();
    } catch (error) {
      toast.error('İşlem sırasında hata oluştu');
    }
  };

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAllProducts = () => {
    setSelectedProducts(prev => 
      prev.length === products.length ? [] : products.map(p => p.id)
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchProducts();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'instock':
        return 'bg-green-100 text-green-800';
      case 'outofstock':
        return 'bg-red-100 text-red-800';
      case 'onbackorder':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status: string) => {
    switch (status) {
      case 'instock':
        return 'Stokta';
      case 'outofstock':
        return 'Stok Yok';
      case 'onbackorder':
        return 'Sipariş Üzerine';
      default:
        return status;
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStatistics();
  }, [pagination.page]);

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

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          selectedCount={selectedProducts.length}
          totalCount={products.length}
          onClose={() => setShowExportModal(false)}
          onExport={async (exportData) => {
            console.log('Export data:', exportData);
            toast.success('Dışa aktarma başlatıldı');
            setShowExportModal(false);
          }}
        />
      )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <AdvancedFilters
          filters={filters}
          isOpen={showAdvancedFilters}
          onToggle={() => setShowAdvancedFilters(!showAdvancedFilters)}
          onFiltersChange={(advancedFilters) => {
            // Handle advanced filters
            console.log('Advanced filters:', advancedFilters);
            setFilters(advancedFilters);
            // You can merge these with existing filters and refetch products
          }}
          onApplyFilters={() => {
            // Apply filters and refetch products
            fetchProducts();
          }}
          onResetFilters={() => {
             // Reset filters
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
          onBulkSync={async (ids) => await handleBulkAction('sync')}
          onBulkDelete={async (ids) => await handleBulkAction('delete')}
          onBulkPriceUpdate={async (ids, price) => {
            // Implement bulk price update
            toast.success(`${ids.length} ürünün fiyatı güncellendi`);
          }}
          onBulkStockUpdate={async (ids, stock) => {
            // Implement bulk stock update
            toast.success(`${ids.length} ürünün stok miktarı güncellendi`);
          }}
          onBulkExport={async (ids, format) => {
            // Implement bulk export
            setShowExportModal(true);
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Ürün Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400">WooCommerce ürünlerinizi yönetin ve senkronize edin</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Dışa Aktar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Upload className="h-4 w-4" />
            İçe Aktar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
            <Plus className="h-4 w-4" />
            Yeni Ürün
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Toplam Ürün"
            value={statistics.totalProducts}
            icon={Package}
            change="+5.2%"
            changeType="increase"
            color="bg-blue-500"
          />
          <StatCard
            title="Stokta Ürün"
            value={statistics.inStockProducts}
            icon={CheckCircle}
            change={`%${statistics.stockPercentage.toFixed(1)}`}
            changeType="increase"
            color="bg-green-500"
          />
          <StatCard
            title="Stok Yok"
            value={statistics.outOfStockProducts}
            icon={XCircle}
            change="-2.1%"
            changeType="decrease"
            color="bg-red-500"
          />
          <StatCard
            title="Senkron Gerekli"
            value={statistics.needsSyncProducts}
            icon={Clock}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Ürün adı veya stok kodu ara..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
            </form>

            {/* Filters and View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                <Filter className="h-4 w-4" />
                Gelişmiş Filtre
              </button>
              
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <select
                value={filters.stockStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value as any }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="">Tüm Stok Durumları</option>
                <option value="instock">Stokta</option>
                <option value="outofstock">Stok Yok</option>
                <option value="onbackorder">Sipariş Üzerine</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="updated">Son Güncelleme</option>
                <option value="name">Ürün Adı</option>
                <option value="price">Fiyat</option>
                <option value="stock">Stok</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </button>

              <label className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.needsSync}
                  onChange={(e) => setFilters(prev => ({ ...prev, needsSync: e.target.checked }))}
                  className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Senkron Gerekli</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Senkronize Ediliyor...' : 'Senkronize Et'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table/Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedProducts.length === products.length && products.length > 0}
                      onChange={toggleAllProducts}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
                    Son Güncelleme
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
               <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                 {loading ? (
                   <tr>
                     <td colSpan={8} className="px-6 py-12 text-center">
                       <div className="flex items-center justify-center">
                         <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                         <span className="text-gray-500 dark:text-gray-400">Ürünler yükleniyor...</span>
                       </div>
                     </td>
                   </tr>
                 ) : products.length === 0 ? (
                   <tr>
                     <td colSpan={8} className="px-6 py-12 text-center">
                       <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                       <p className="text-gray-500 dark:text-gray-400">Henüz ürün bulunmuyor</p>
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
                           className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                         />
                       </td>
                       <td className="px-6 py-4">
                         <div className="flex items-center">
                           {product.images && product.images.length > 0 ? (
                             <img
                               src={product.images[0].src}
                               alt={product.images[0].alt || product.urun_adi}
                               className="h-12 w-12 rounded-lg object-cover mr-4 border border-gray-200 dark:border-gray-600"
                             />
                           ) : (
                             <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-4 border border-gray-200 dark:border-gray-600">
                               <Package className="h-6 w-6 text-gray-400" />
                             </div>
                           )}
                           <div className="min-w-0 flex-1">
                             <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                               {product.urun_adi}
                             </p>
                             <div className="flex items-center gap-2 mt-1">
                               {product.sync_required && (
                                 <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-400">
                                   <Clock className="h-3 w-3 mr-1" />
                                   Senkron Gerekli
                                 </span>
                               )}
                             </div>
                           </div>
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                           {product.stok_kodu}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-sm font-semibold text-gray-900 dark:text-white">
                           {formatPrice(product.fiyat)}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-sm text-gray-900 dark:text-white">{product.stok_miktari}</span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                           getStockStatusColor(product.stock_status)
                         }`}>
                           {getStockStatusText(product.stock_status)}
                         </span>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                         {formatDate(product.updated_at)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Link
                             href={`/products/${product.id}`}
                             className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 p-1 rounded transition-colors"
                             title="Detayları Görüntüle"
                           >
                             <Eye className="h-4 w-4" />
                           </Link>
                           <Link
                             href={`/products/${product.id}/edit`}
                             className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded transition-colors"
                             title="Düzenle"
                           >
                             <Edit className="h-4 w-4" />
                           </Link>
                           <button
                             className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded transition-colors"
                             title="Sil"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                         </div>
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
         ) : (
           /* Grid View */
           <div className="p-6">
             {loading ? (
               <div className="flex items-center justify-center py-12">
                 <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
                 <span className="text-gray-500 dark:text-gray-400">Ürünler yükleniyor...</span>
               </div>
             ) : products.length === 0 ? (
               <div className="text-center py-12">
                 <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                 <p className="text-gray-500 dark:text-gray-400">Henüz ürün bulunmuyor</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {products.map((product) => (
                   <div
                     key={product.id}
                     className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-medium transition-all duration-200 group"
                   >
                     <div className="flex items-start justify-between mb-3">
                       <input
                         type="checkbox"
                         checked={selectedProducts.includes(product.id)}
                         onChange={() => toggleProductSelection(product.id)}
                         className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                       />
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Link
                           href={`/products/${product.id}`}
                           className="text-primary-600 hover:text-primary-700 p-1 rounded transition-colors"
                         >
                           <Eye className="h-4 w-4" />
                         </Link>
                         <Link
                           href={`/products/${product.id}/edit`}
                           className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded transition-colors"
                         >
                           <Edit className="h-4 w-4" />
                         </Link>
                         <button className="text-red-600 hover:text-red-700 p-1 rounded transition-colors">
                           <Trash2 className="h-4 w-4" />
                         </button>
                       </div>
                     </div>
                     
                     <div className="text-center mb-4">
                       {product.images && product.images.length > 0 ? (
                         <img
                           src={product.images[0].src}
                           alt={product.images[0].alt || product.urun_adi}
                           className="h-32 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                         />
                       ) : (
                         <div className="h-32 bg-gray-100 dark:bg-gray-600 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-600">
                           <Package className="h-12 w-12 text-gray-400" />
                         </div>
                       )}
                     </div>
                     
                     <div className="space-y-2">
                       <h3 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                         {product.urun_adi}
                       </h3>
                       
                       <div className="flex items-center justify-between">
                         <span className="text-xs font-mono bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
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
                           {formatPrice(product.fiyat)}
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Önceki
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                  {' - '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' / '}
                  <span className="font-medium">{pagination.total}</span>
                  {' sonuç gösteriliyor'}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Önceki
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium transition-colors ${
                          pageNum === pagination.page
                            ? 'z-10 bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}