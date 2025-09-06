'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react';

interface TestResult {
  id: string;
  timestamp: string;
  stockCode: string;
  supplier: string;
  success: boolean;
  price?: number;
  stock?: number;
  isAvailable?: boolean;
  foundAtSupplier?: boolean;
  error?: string;
  duration?: number;
}

interface ScraperStatus {
  supplier: string;
  port: number;
  status: 'online' | 'offline' | 'checking';
  lastCheck: string;
  responseTime?: number;
}

export default function TestScraperPage() {
  const [stockCode, setStockCode] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('dogus');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [scraperStatuses, setScraperStatuses] = useState<ScraperStatus[]>([
    { supplier: 'Doğuş', port: 5003, status: 'checking', lastCheck: '' },
    { supplier: 'Başbuğ', port: 5002, status: 'checking', lastCheck: '' },
    { supplier: 'Dinamik', port: 5001, status: 'checking', lastCheck: '' }
  ]);

  const suppliers = [
    { value: 'dogus', label: 'Doğuş', port: 5003 },
    { value: 'basbug', label: 'Başbuğ', port: 5002 },
    { value: 'dinamik', label: 'Dinamik', port: 5001 }
  ];

  // Check scraper statuses on component mount
  useEffect(() => {
    checkAllScraperStatuses();
    // Check statuses every 30 seconds
    const interval = setInterval(checkAllScraperStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkScraperStatus = async (supplier: string, port: number): Promise<ScraperStatus> => {
    const startTime = Date.now();
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        return {
          supplier,
          port,
          status: 'online',
          lastCheck: new Date().toLocaleTimeString('tr-TR'),
          responseTime
        };
      } else {
        return {
          supplier,
          port,
          status: 'offline',
          lastCheck: new Date().toLocaleTimeString('tr-TR')
        };
      }
    } catch (error) {
      return {
        supplier,
        port,
        status: 'offline',
        lastCheck: new Date().toLocaleTimeString('tr-TR')
      };
    }
  };

  const checkAllScraperStatuses = async () => {
    const statusPromises = scraperStatuses.map(scraper => 
      checkScraperStatus(scraper.supplier, scraper.port)
    );
    
    const newStatuses = await Promise.all(statusPromises);
    setScraperStatuses(newStatuses);
  };

  const testScraper = async () => {
    if (!stockCode.trim()) {
      toast.error('Lütfen bir stok kodu girin');
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();
    const testId = Date.now().toString();

    try {
      const supplier = suppliers.find(s => s.value === selectedSupplier);
      if (!supplier) {
        throw new Error('Geçersiz tedarikçi seçimi');
      }

      // Test direct scraper connection
      const response = await fetch(`http://localhost:${supplier.port}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stock_code: stockCode.trim(),
          supplier: selectedSupplier
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      const duration = Date.now() - startTime;
      const result = await response.json();

      const testResult: TestResult = {
        id: testId,
        timestamp: new Date().toLocaleString('tr-TR'),
        stockCode: stockCode.trim(),
        supplier: supplier.label,
        success: result.success,
        duration,
        ...result
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 19)]); // Keep last 20 results

      if (result.success) {
        if (result.foundAtSupplier !== false) {
          toast.success(`Test başarılı! Fiyat: ₺${result.price}, Stok: ${result.stock}`);
        } else {
          toast.warning('Ürün bu tedarikçide bulunamadı');
        }
      } else {
        toast.error(`Test başarısız: ${result.error || 'Bilinmeyen hata'}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        id: testId,
        timestamp: new Date().toLocaleString('tr-TR'),
        stockCode: stockCode.trim(),
        supplier: suppliers.find(s => s.value === selectedSupplier)?.label || selectedSupplier,
        success: false,
        error: error instanceof Error ? error.message : 'Bağlantı hatası',
        duration
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 19)]);
      toast.error(`Bağlantı hatası: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'checking': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />;
      case 'offline': return <XCircle className="h-4 w-4" />;
      case 'checking': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Scraper Test Alanı
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Tedarikçi scraper'larını test edin ve sonuçları görüntüleyin
            </p>
          </div>
        </div>
      </div>

      {/* Scraper Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scraperStatuses.map((scraper) => (
          <div key={scraper.supplier} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {scraper.supplier}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(scraper.status)}`}>
                {getStatusIcon(scraper.status)}
                <span className="ml-1 capitalize">{scraper.status}</span>
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Port:</span>
                <span className="font-mono">{scraper.port}</span>
              </div>
              <div className="flex justify-between">
                <span>Son Kontrol:</span>
                <span>{scraper.lastCheck || 'Henüz kontrol edilmedi'}</span>
              </div>
              {scraper.responseTime && (
                <div className="flex justify-between">
                  <span>Yanıt Süresi:</span>
                  <span>{scraper.responseTime}ms</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Test Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Scraper Testi
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stok Kodu
            </label>
            <input
              type="text"
              value={stockCode}
              onChange={(e) => setStockCode(e.target.value)}
              placeholder="Örn: BOSCH-123456"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tedarikçi
            </label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            >
              {suppliers.map((supplier) => (
                <option key={supplier.value} value={supplier.value}>
                  {supplier.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={testScraper}
              disabled={isLoading || !stockCode.trim()}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Test Ediliyor...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Test Et
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Test Sonuçları
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Son {testResults.length} test sonucu
          </p>
        </div>
        
        <div className="overflow-x-auto">
          {testResults.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz test yapılmadı</p>
              <p className="text-sm mt-1">Yukarıdaki formu kullanarak scraper testini başlatın</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Zaman
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stok Kodu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tedarikçi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Fiyat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Süre
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {testResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                        {result.timestamp}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {result.stockCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {result.success ? (
                        result.foundAtSupplier !== false ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Başarılı
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Bulunamadı
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Hata
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.price !== undefined ? (
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                          ₺{result.price.toFixed(2)}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.stock !== undefined ? (
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-1 text-blue-500" />
                          {result.stock}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {result.duration ? `${result.duration}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}