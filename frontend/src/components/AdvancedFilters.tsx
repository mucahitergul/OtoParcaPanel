'use client';

import { useState } from 'react';
import { 
  Filter, 
  X, 
  Calendar, 
  DollarSign, 
  Package, 
  Tag,
  ChevronDown,
  Search,
  RotateCcw
} from 'lucide-react';

interface FilterOptions {
  search: string;
  stockStatus: '' | 'instock' | 'outofstock' | 'onbackorder';
  priceRange: {
    min: number | '';
    max: number | '';
  };
  stockRange: {
    min: number | '';
    max: number | '';
  };
  dateRange: {
    from: string;
    to: string;
  };
  categories: string[];
  needsSync: boolean;
  hasImages: boolean | null;
  sortBy: 'name' | 'price' | 'stock' | 'updated' | 'created';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const defaultFilters: FilterOptions = {
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
};

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  isOpen,
  onToggle
}: AdvancedFiltersProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleRangeChange = (rangeKey: 'priceRange' | 'stockRange', field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? '' : Number(value);
    const newRange = { ...localFilters[rangeKey], [field]: numValue };
    handleFilterChange(rangeKey, newRange);
  };

  const handleReset = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    onResetFilters();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.stockStatus) count++;
    if (localFilters.priceRange.min !== '' || localFilters.priceRange.max !== '') count++;
    if (localFilters.stockRange.min !== '' || localFilters.stockRange.max !== '') count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.categories.length > 0) count++;
    if (localFilters.needsSync) count++;
    if (localFilters.hasImages !== null) count++;
    return count;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <Filter className="h-5 w-5" />
          <span className="font-medium">Gelişmiş Filtreler</span>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
              {getActiveFiltersCount()}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Sıfırla
          </button>
          <button
            onClick={onApplyFilters}
            className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Filtrele
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isOpen && (
        <div className="p-6 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Arama
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Ürün adı, stok kodu veya açıklama ara..."
                value={localFilters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stock Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stok Durumu
              </label>
              <select
                value={localFilters.stockStatus}
                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="">Tüm Durumlar</option>
                <option value="instock">Stokta</option>
                <option value="outofstock">Stok Yok</option>
                <option value="onbackorder">Sipariş Üzerine</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sıralama
              </label>
              <div className="flex gap-2">
                <select
                  value={localFilters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                >
                  <option value="updated">Son Güncelleme</option>
                  <option value="created">Oluşturma Tarihi</option>
                  <option value="name">Ürün Adı</option>
                  <option value="price">Fiyat</option>
                  <option value="stock">Stok Miktarı</option>
                </select>
                <select
                  value={localFilters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                >
                  <option value="desc">Azalan</option>
                  <option value="asc">Artan</option>
                </select>
              </div>
            </div>

            {/* Has Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Görsel Durumu
              </label>
              <select
                value={localFilters.hasImages === null ? '' : localFilters.hasImages.toString()}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : e.target.value === 'true';
                  handleFilterChange('hasImages', value);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              >
                <option value="">Tümü</option>
                <option value="true">Görseli Var</option>
                <option value="false">Görseli Yok</option>
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Fiyat Aralığı (TL)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min fiyat"
                  value={localFilters.priceRange.min}
                  onChange={(e) => handleRangeChange('priceRange', 'min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max fiyat"
                  value={localFilters.priceRange.max}
                  onChange={(e) => handleRangeChange('priceRange', 'max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Stock Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Package className="inline h-4 w-4 mr-1" />
              Stok Miktarı Aralığı
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  placeholder="Min stok"
                  value={localFilters.stockRange.min}
                  onChange={(e) => handleRangeChange('stockRange', 'min', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Max stok"
                  value={localFilters.stockRange.max}
                  onChange={(e) => handleRangeChange('stockRange', 'max', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Tarih Aralığı
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="date"
                  value={localFilters.dateRange.from}
                  onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={localFilters.dateRange.to}
                  onChange={(e) => handleFilterChange('dateRange', { ...localFilters.dateRange, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Ek Seçenekler
            </label>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={localFilters.needsSync}
                  onChange={(e) => handleFilterChange('needsSync', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mr-3"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Sadece senkronizasyon gereken ürünler
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}