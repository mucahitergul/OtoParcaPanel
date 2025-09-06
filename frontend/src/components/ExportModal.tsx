'use client';

import { useState } from 'react';
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  X, 
  CheckCircle, 
  Settings,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => Promise<void>;
  selectedCount?: number;
  totalCount: number;
}

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  scope: 'selected' | 'filtered' | 'all';
  fields: string[];
  includeImages: boolean;
  dateRange?: {
    from: string;
    to: string;
  };
}

const availableFields = [
  { key: 'stok_kodu', label: 'Stok Kodu', default: true },
  { key: 'urun_adi', label: 'Ürün Adı', default: true },
  { key: 'fiyat', label: 'Fiyat', default: true },
  { key: 'stok_miktari', label: 'Stok Miktarı', default: true },
  { key: 'stock_status', label: 'Stok Durumu', default: true },
  { key: 'regular_price', label: 'Normal Fiyat', default: false },
  { key: 'sale_price', label: 'İndirimli Fiyat', default: false },
  { key: 'categories', label: 'Kategoriler', default: false },
  { key: 'woo_product_id', label: 'WooCommerce ID', default: false },
  { key: 'last_sync_date', label: 'Son Senkronizasyon', default: false },
  { key: 'created_at', label: 'Oluşturma Tarihi', default: false },
  { key: 'updated_at', label: 'Güncelleme Tarihi', default: false }
];

export default function ExportModal({
  isOpen,
  onClose,
  onExport,
  selectedCount = 0,
  totalCount
}: ExportModalProps) {
  const [format, setFormat] = useState<'csv' | 'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'selected' | 'filtered' | 'all'>(
    selectedCount > 0 ? 'selected' : 'all'
  );
  const [selectedFields, setSelectedFields] = useState<string[]>(
    availableFields.filter(field => field.default).map(field => field.key)
  );
  const [includeImages, setIncludeImages] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(false);

  const handleFieldToggle = (fieldKey: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldKey)
        ? prev.filter(key => key !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(availableFields.map(field => field.key));
  };

  const handleDeselectAllFields = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Lütfen en az bir alan seçin');
      return;
    }

    try {
      setLoading(true);
      
      const exportOptions: ExportOptions = {
        format,
        scope,
        fields: selectedFields,
        includeImages,
        dateRange: dateRange.from || dateRange.to ? dateRange : undefined
      };

      await onExport(exportOptions);
      
      toast.success(`Veriler ${format.toUpperCase()} formatında dışa aktarıldı`);
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Dışa aktarma sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getRecordCount = () => {
    switch (scope) {
      case 'selected':
        return selectedCount;
      case 'filtered':
        return totalCount; // This would be filtered count in real implementation
      case 'all':
        return totalCount;
      default:
        return 0;
    }
  };

  const getFormatIcon = (formatType: string) => {
    switch (formatType) {
      case 'csv':
        return <FileText className="h-5 w-5" />;
      case 'excel':
        return <FileSpreadsheet className="h-5 w-5" />;
      case 'pdf':
        return <FileText className="h-5 w-5" />;
      default:
        return <Download className="h-5 w-5" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
              <Download className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Veri Dışa Aktarma
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ürün verilerini farklı formatlarda dışa aktarın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Dosya Formatı
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['csv', 'excel', 'pdf'] as const).map((formatType) => (
                <button
                  key={formatType}
                  onClick={() => setFormat(formatType)}
                  className={`p-4 transition-all ${
                    format === formatType
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    {getFormatIcon(formatType)}
                    <span className="text-sm font-medium capitalize">
                      {formatType === 'excel' ? 'Excel' : formatType.toUpperCase()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Dışa Aktarılacak Veriler
            </label>
            <div className="space-y-2">
              {selectedCount > 0 && (
                <label className="flex items-center p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <input
                    type="radio"
                    name="scope"
                    value="selected"
                    checked={scope === 'selected'}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="mr-3 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Seçili Ürünler ({selectedCount})
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Sadece seçtiğiniz ürünleri dışa aktar
                    </div>
                  </div>
                </label>
              )}
              
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <input
                  type="radio"
                  name="scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="mr-3 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Filtrelenmiş Ürünler ({totalCount})
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Mevcut filtrelere göre görünen ürünleri dışa aktar
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={(e) => setScope(e.target.value as any)}
                  className="mr-3 text-primary-600 focus:ring-primary-500"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Tüm Ürünler ({totalCount})
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Veritabanındaki tüm ürünleri dışa aktar
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Field Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dışa Aktarılacak Alanlar ({selectedFields.length}/{availableFields.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllFields}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Tümünü Seç
                </button>
                <button
                  onClick={handleDeselectAllFields}
                  className="text-xs text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Tümünü Kaldır
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              {availableFields.map((field) => (
                <label key={field.key} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={() => handleFieldToggle(field.key)}
                    className="mr-2 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {field.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Calendar className="inline h-4 w-4 mr-1" />
              Tarih Aralığı (Opsiyonel)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Bitiş Tarihi
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Ek Seçenekler
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Ürün görsellerini dahil et (sadece Excel ve PDF için)
                </span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-gray-900 dark:text-white">
                Dışa Aktarma Özeti
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <div>Format: {format.toUpperCase()}</div>
              <div>Kayıt Sayısı: {getRecordCount()}</div>
              <div>Alan Sayısı: {selectedFields.length}</div>
              {dateRange.from && <div>Tarih Aralığı: {dateRange.from} - {dateRange.to || 'Bugün'}</div>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleExport}
            disabled={loading || selectedFields.length === 0}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Dışa Aktarılıyor...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Dışa Aktar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}