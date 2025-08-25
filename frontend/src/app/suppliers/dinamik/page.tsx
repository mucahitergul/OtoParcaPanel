'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Package, TrendingUp, TrendingDown, AlertTriangle, ArrowLeft, Play, Square, Bot } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: number;
  stok_kodu: string;
  urun_adi: string;
  fiyat: number;
  stok_miktari: number;
  dinamik_price?: number;
  dinamik_stock?: number;
  dinamik_last_updated?: string;
  woo_last_update?: string;
}

export default function DinamikSupplierPage() {
  const { token, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
  const [currentUpdatingProduct, setCurrentUpdatingProduct] = useState<string | null>(null);
  const [scrapingProduct, setScrapingProduct] = useState<number | null>(null);
  
  // useRef for controlling the update loop
  const shouldContinueUpdating = useRef(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const updatePrices = async () => {
    try {
      setUpdating(true);
      shouldContinueUpdating.current = true;
      
      const filteredProducts = products.filter(product => 
        product.stok_kodu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.urun_adi.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Ürünleri güncelleme tarihine göre sırala (en eskiden en yeniye)
      const sortedProducts = [...filteredProducts].sort((a, b) => {
        const dateA = a.dinamik_last_updated ? new Date(a.dinamik_last_updated).getTime() : 0;
        const dateB = b.dinamik_last_updated ? new Date(b.dinamik_last_updated).getTime() : 0;
        return dateA - dateB; // En eski önce
      });
      
      setUpdateProgress({ current: 0, total: sortedProducts.length, success: 0, failed: 0 });
      
      toast.info(`${sortedProducts.length} ürün güncelleme tarihine göre sıralandı (en eskiden en yeniye)`);
      
      let successCount = 0;
      let failedCount = 0;
      
      for (let i = 0; i < sortedProducts.length; i++) {
        // useRef ile kontrol et - React state'ine bağımlı değil
        if (!shouldContinueUpdating.current) {
          toast.info('Güncelleme kullanıcı tarafından durduruldu');
          break;
        }
        
        const product = sortedProducts[i];
        setCurrentUpdatingProduct(product.stok_kodu);
        
        try {
          // Scraper bot ile güncelleme yap - ürün seviyesinde error handling
          await updateSingleProductWithScraper(product);
          successCount++;
          
          toast.success(`${product.stok_kodu} başarıyla güncellendi (${i + 1}/${sortedProducts.length})`);
        } catch (error) {
          failedCount++;
          console.error(`Error updating product ${product.stok_kodu}:`, error);
          toast.error(`${product.stok_kodu} güncellenirken hata oluştu - devam ediliyor`);
        }
        
        // Progress güncelle
        setUpdateProgress({ 
          current: i + 1, 
          total: sortedProducts.length, 
          success: successCount, 
          failed: failedCount 
        });
        
        // Rate limiting için bekle (sadece son ürün değilse)
        if (i < sortedProducts.length - 1 && shouldContinueUpdating.current) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Final sonuç mesajı
      if (shouldContinueUpdating.current) {
        toast.success(`Güncelleme tamamlandı! Başarılı: ${successCount}, Başarısız: ${failedCount}`);
      }
      
    } catch (error) {
      console.error('Error in updatePrices:', error);
      toast.error('Fiyat güncelleme sırasında genel hata oluştu');
    } finally {
      setUpdating(false);
      setCurrentUpdatingProduct(null);
      shouldContinueUpdating.current = false;
    }
  };

  const stopUpdate = () => {
    shouldContinueUpdating.current = false;
    setUpdating(false);
    setCurrentUpdatingProduct(null);
    toast.info('Güncelleme durduruluyor...');
  };

  const updateSingleProductWithScraper = async (product: Product) => {
    setScrapingProduct(product.id);
    
    try {
      // Try direct Python scraper first, then fallback to backend
      let response;
      try {
        // Direct call to Python scraper (port 5000)
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 10000);
        
        response = await fetch('http://localhost:5000/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            stockCode: product.stok_kodu,
            supplier: 'Dinamik'
          }),
          signal: controller1.signal,
        });
        
        clearTimeout(timeoutId1);
      } catch (directError) {
         console.warn('Direct scraper call failed, trying backend proxy:', directError);
         // Fallback to backend proxy with authentication
         const headers: Record<string, string> = {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
         };
         
         // Add authentication header if available
         if (token) {
           headers['Authorization'] = `Bearer ${token}`;
         }
         
         const controller2 = new AbortController();
         const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
         
         const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://otoparca.isletmemdijitalde.com/api';
         response = await fetch(`${baseUrl}/scraper/request-update`, {
           method: 'POST',
           headers,
           body: JSON.stringify({
             stockCode: product.stok_kodu,
             supplier: 'Dinamik'
           }),
           signal: controller2.signal,
         });
         
         clearTimeout(timeoutId2);
       }
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response received:', textResponse);
        throw new Error('Scraper bot\'tan geçersiz yanıt formatı alındı (JSON bekleniyor)');
      }
      
      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error('Scraper bot\'tan gelen yanıt JSON formatında değil');
      }
      
      if (response.ok) {
        let scrapedData: any;
        
        // Handle different response formats (direct scraper vs backend proxy)
        if (result.success) {
          if (result.data && result.data.success) {
            // Backend proxy response format
            scrapedData = result.data;
          } else if (result.price !== undefined && result.stock !== undefined) {
            // Direct Python scraper response format
            scrapedData = result;
          } else {
            throw new Error('Geçersiz yanıt formatı');
          }
          
          // Ürün listesini güncelle
          setProducts(prev => prev.map(p => 
            p.id === product.id 
              ? { 
                  ...p, 
                  dinamik_price: scrapedData.price, 
                  dinamik_stock: scrapedData.stock, 
                  dinamik_last_updated: new Date().toISOString() 
                }
              : p
          ));
          
          // Success - no toast here, handled by parent function
          return scrapedData;
        } else {
          throw new Error(result.error || 'Scraper bot\'tan hata alındı');
        }
      } else {
        throw new Error(result.message || result.error || `HTTP ${response.status}: API hatası`);
      }
    } catch (error) {
      // Re-throw error to be handled by parent function
      let errorMessage = (error as Error).message || 'Bilinmeyen hata';
      
      // Handle specific error types
      if ((error as Error).name === 'TypeError' && (error as Error).message.includes('fetch')) {
        errorMessage = 'Scraper bot\'a bağlanılamıyor. Bot çalışıyor mu?';
      } else if ((error as Error).message.includes('JSON')) {
        errorMessage = 'Scraper bot\'tan geçersiz yanıt alındı';
      }
      
      throw new Error(errorMessage);
    } finally {
      setScrapingProduct(null);
    }
  };

  const filteredProducts = products.filter(product => 
    product.stok_kodu.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.urun_adi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatPrice = (price: number | string | undefined) => {
    if (price === undefined || price === null) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 'N/A';
    return `₺${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Hiç güncellenmedi';
    return new Date(dateString).toLocaleString('tr-TR');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/suppliers"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dinamik Tedarikçi</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Dinamik firmasından fiyat ve stok bilgilerini yönetin
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {updating ? (
              <Button
                onClick={stopUpdate}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Güncellemeyi Durdur
              </Button>
            ) : (
              <Button
                onClick={updatePrices}
                disabled={loading || filteredProducts.length === 0}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Fiyatları Güncelle
              </Button>
            )}
          </div>
        </div>

        {/* Update Progress */}
        {updating && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Güncelleme İlerlemesi
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {updateProgress.current} / {updateProgress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(updateProgress.current / updateProgress.total) * 100}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    Başarılı: {updateProgress.success}
                  </span>
                  <span className="text-red-600 dark:text-red-400">
                    Başarısız: {updateProgress.failed}
                  </span>
                </div>
                {currentUpdatingProduct && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Güncelleniyor: <span className="font-medium">{currentUpdatingProduct}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Stok kodu veya ürün adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                disabled={updating}
              />
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Dinamik Ürün Listesi
            </CardTitle>
            <CardDescription>
              Toplam {filteredProducts.length} ürün listeleniyor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Yükleniyor...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stok Kodu</TableHead>
                      <TableHead>Ürün Adı</TableHead>
                      <TableHead>Mevcut Fiyat</TableHead>
                      <TableHead>Mevcut Stok</TableHead>
                      <TableHead>Dinamik Fiyat</TableHead>
                      <TableHead>Dinamik Stok</TableHead>
                      <TableHead>Son Güncelleme</TableHead>
                      <TableHead>WooCommerce Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow 
                        key={product.id}
                        className={currentUpdatingProduct === product.stok_kodu ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      >
                        <TableCell className="font-medium">{product.stok_kodu}</TableCell>
                        <TableCell className="max-w-xs truncate">{product.urun_adi}</TableCell>
                        <TableCell>{formatPrice(product.fiyat)}</TableCell>
                        <TableCell>
                          <Badge variant={product.stok_miktari > 0 ? 'default' : 'destructive'}>
                            {product.stok_miktari}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-blue-600">
                            {formatPrice(product.dinamik_price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.dinamik_stock && product.dinamik_stock > 0 ? 'default' : 'destructive'}
                            className="bg-blue-100 text-blue-800"
                          >
                            {product.dinamik_stock || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(product.dinamik_last_updated)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(product.woo_last_update)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateSingleProductWithScraper(product)}
                            disabled={scrapingProduct === product.id || updating}
                            className="flex items-center gap-1"
                          >
                            {scrapingProduct === product.id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Bot className="h-3 w-3" />
                            )}
                            {scrapingProduct === product.id ? 'Güncelleniyor...' : 'Bot ile Güncelle'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}