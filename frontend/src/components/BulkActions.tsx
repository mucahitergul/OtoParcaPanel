'use client';

import { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Trash2, 
  Download, 
  Upload, 
  Edit, 
  Tag, 
  DollarSign,
  Package,
  AlertTriangle,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkActionsProps {
  selectedItems: number[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkSync: (ids: number[]) => Promise<void>;
  onBulkDelete: (ids: number[]) => Promise<void>;
  onBulkPriceUpdate: (ids: number[], price: number) => Promise<void>;
  onBulkStockUpdate: (ids: number[], stock: number) => Promise<void>;
  onBulkExport: (ids: number[], format: 'csv' | 'excel') => Promise<void>;
  className?: string;
}

type BulkAction = 'sync' | 'delete' | 'price' | 'stock' | 'export' | 'category';

export default function BulkActions({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onBulkSync,
  onBulkDelete,
  onBulkPriceUpdate,
  onBulkStockUpdate,
  onBulkExport,
  className = ''
}: BulkActionsProps) {
  const [activeAction, setActiveAction] = useState<BulkAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [stockValue, setStockValue] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<BulkAction | null>(null);

  const isAllSelected = selectedItems.length === totalItems && totalItems > 0;
  const isSomeSelected = selectedItems.length > 0 && selectedItems.length < totalItems;

  const handleSelectToggle = () => {
    if (isAllSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handleAction = async (action: BulkAction) => {
    if (selectedItems.length === 0) {
      toast.warning('Lütfen işlem yapmak için ürün seçin');
      return;
    }

    if (action === 'delete') {
      setConfirmAction(action);
      setShowConfirmDialog(true);
      return;
    }

    setActiveAction(action);
  };

  const executeAction = async (action: BulkAction) => {
    try {
      setLoading(true);
      
      switch (action) {
        case 'sync':
          await onBulkSync(selectedItems);
          toast.success(`${selectedItems.length} ürün senkronize edildi`);
          break;
          
        case 'delete':
          await onBulkDelete(selectedItems);
          toast.success(`${selectedItems.length} ürün kalıcı olarak silindi`);
          break;
          
        case 'price':
          if (!priceValue || Number(priceValue) <= 0) {
            toast.error('Geçerli bir fiyat girin');
            return;
          }
          await onBulkPriceUpdate(selectedItems, Number(priceValue));
          toast.success(`${selectedItems.length} ürünün fiyatı güncellendi`);
          setPriceValue('');
          break;
          
        case 'stock':
          if (!stockValue || Number(stockValue) < 0) {
            toast.error('Geçerli bir stok miktarı girin');
            return;
          }
          await onBulkStockUpdate(selectedItems, Number(stockValue));
          toast.success(`${selectedItems.length} ürünün stok miktarı güncellendi`);
          setStockValue('');
          break;
          
        case 'export':
          await onBulkExport(selectedItems, 'excel');
          toast.success(`${selectedItems.length} ürün Excel formatında dışa aktarıldı`);
          break;
      }
      
      setActiveAction(null);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('İşlem sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const cancelAction = () => {
    setActiveAction(null);
    setShowConfirmDialog(false);
    setConfirmAction(null);
    setPriceValue('');
    setStockValue('');
  };

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          {/* Selection Info */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectToggle}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {isAllSelected ? (
                <CheckSquare className="h-5 w-5 text-primary-600" />
              ) : isSomeSelected ? (
                <div className="h-5 w-5 bg-primary-600 rounded border-2 border-primary-600 flex items-center justify-center">
                  <div className="h-2 w-2 bg-white rounded-sm" />
                </div>
              ) : (
                <Square className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                {selectedItems.length > 0 
                  ? `${selectedItems.length} ürün seçili`
                  : 'Tümünü seç'
                }
              </span>
            </button>
            
            {selectedItems.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {totalItems} üründen {selectedItems.length} tanesi
              </span>
            )}
          </div>

          {/* Action Buttons */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAction('sync')}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading && activeAction === 'sync' ? 'animate-spin' : ''}`} />
                Senkronize Et
              </button>
              
              <button
                onClick={() => handleAction('price')}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Fiyat Güncelle
              </button>
              
              <button
                onClick={() => handleAction('stock')}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Package className="h-4 w-4" />
                Stok Güncelle
              </button>
              
              <button
                onClick={() => handleAction('export')}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="h-4 w-4" />
                Dışa Aktar
              </button>
              
              <button
                onClick={() => handleAction('delete')}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Modals */}
      {activeAction === 'price' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Toplu Fiyat Güncelleme
              </h3>
              <button
                onClick={cancelAction}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedItems.length} ürünün fiyatını güncellemek istiyorsunuz.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yeni Fiyat (TL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder="Örn: 99.99"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelAction}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => executeAction('price')}
                disabled={loading || !priceValue}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeAction === 'stock' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Toplu Stok Güncelleme
              </h3>
              <button
                onClick={cancelAction}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedItems.length} ürünün stok miktarını güncellemek istiyorsunuz.
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Yeni Stok Miktarı
              </label>
              <input
                type="number"
                min="0"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                placeholder="Örn: 100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={cancelAction}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => executeAction('stock')}
                disabled={loading || !stockValue}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && confirmAction === 'delete' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ürünleri Sil
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {selectedItems.length} ürünü kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve ürünler veritabanından tamamen kaldırılacaktır.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelAction}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => executeAction('delete')}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}