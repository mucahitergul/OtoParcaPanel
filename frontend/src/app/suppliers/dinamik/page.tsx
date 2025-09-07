'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  RefreshCw, 
  Search, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ArrowLeft, 
  Play, 
  Square, 
  Bot,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Zap,
  Activity,
  Target,
  Layers,
  Database,
  Globe,
  Settings,
  Star,
  Shield,
  Cpu,
  StopCircle,
  Pause,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: number;
  stok_kodu: string;
  urun_adi: string;
  regular_price: number;
  stok_miktari: number;
  dinamik_price?: number;
  dinamik_stock?: number;
  dinamik_last_updated?: string;
  basbug_price?: number;
  basbug_stock?: number;
  basbug_last_updated?: string;
  dogus_price?: number;
  dogus_stock?: number;
  dogus_last_updated?: string;
  woo_last_update?: string;
  supplier_tags?: string[];
}

interface SystemStatus {
  pythonScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
  };
  dinamikScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
    browser_ready?: boolean;
    logged_in?: boolean;
    captcha_waiting?: boolean;
    captcha_resolved?: boolean;
  };
  dogusScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
    browser_ready?: boolean;
    logged_in?: boolean;
    captcha_waiting?: boolean;
    captcha_resolved?: boolean;
  };
  basbugScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
    browser_ready?: boolean;
    logged_in?: boolean;
    captcha_waiting?: boolean;
    captcha_resolved?: boolean;
  };
}

export default function DinamikSupplierPage() {
  const { token, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  const [stockFilter, setStockFilter] = useState<'all' | 'inStock' | 'outOfStock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [updating, setUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, notFound: 0 });
  const [updateStats, setUpdateStats] = useState({ successful: 0, failed: 0, notFound: 0 });
  const [updateCompleted, setUpdateCompleted] = useState(false);
  const [currentUpdatingProduct, setCurrentUpdatingProduct] = useState<string | null>(null);
  const [scrapingProduct, setScrapingProduct] = useState<number | null>(null);
  const [isCaptchaWaiting, setIsCaptchaWaiting] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const shouldContinueUpdating = useRef(true);

  // Sadece Dinamik tedarikçisinin ürünlerini göster
  const dinamikProducts = useMemo(() => {
    return products.filter(product => 
      product.supplier_tags && product.supplier_tags.includes('Dinamik')
    );
  }, [products]);

  // Mevcut tedarikçileri al
  const availableSuppliers = useMemo(() => {
    const suppliers = new Set<string>();
    products.forEach(product => {
      if (product.supplier_tags) {
        product.supplier_tags.forEach(tag => suppliers.add(tag));
      }
    });
    return Array.from(suppliers).sort();
  }, [products]);

  // Filtrelenmiş ürün listesi - Backend'den zaten sadece Dinamik ürünleri geliyor
  const filteredProducts = useMemo(() => {
    const filtered = products.filter(product => {
      // Arama filtresi
      const matchesSearch = product.urun_adi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.stok_kodu.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Tedarikçi filtresi
      const matchesSupplier = selectedSuppliers.length === 0 || 
                             selectedSuppliers.some(supplier => product.supplier_tags?.includes(supplier));
      

      
      // Stok filtresi
      const stock = parseInt(product.stok_miktari?.toString() || '0');
      const matchesStock = stockFilter === 'all' || 
                          (stockFilter === 'inStock' && stock > 0) ||
                          (stockFilter === 'outOfStock' && stock === 0);
      
      return matchesSearch && matchesSupplier && matchesStock;
    });

    // Sıralama
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = parseFloat(a.regular_price?.toString() || '0');
          bValue = parseFloat(b.regular_price?.toString() || '0');
          break;
        case 'stock':
          aValue = parseInt(a.stok_miktari?.toString() || '0');
          bValue = parseInt(b.stok_miktari?.toString() || '0');
          break;
        default: // name
          aValue = a.urun_adi.toLowerCase();
          bValue = b.urun_adi.toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, selectedSuppliers, stockFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchProducts();
    fetchSystemStatus();
    
    // 10 saniyede bir sistem durumunu kontrol et
    const statusInterval = setInterval(() => {
      fetchSystemStatus();
    }, 10000);
    
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  // Pagination değişikliklerini dinle
  useEffect(() => {
    fetchProducts();
  }, [pagination.page]);

  // Arama terimi değiştiğinde ürünleri yeniden getir
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Sayfa tamamen kapanırken güncellemeyi durdur
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (updating) {
        shouldContinueUpdating.current = false;
      }
    };

    // Sadece sayfa kapanırken durdur, sekme değişiminde durdurmayalım
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [updating]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Sadece Dinamik tedarikçisinin ürünlerini getir
      const response = await fetch(`/api/products?page=${pagination.page}&limit=${pagination.limit}&supplier=Dinamik`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProducts(data.data || []);
          setPagination(prev => ({
            ...prev,
            total: data.pagination?.total || 0,
            totalPages: data.pagination?.totalPages || 1,
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const updateDinamikProducts = async () => {
    try {
      setUpdating(true);
      setUpdateCompleted(false);
      shouldContinueUpdating.current = true;
      
      // Tüm ürünleri al (pagination'dan bağımsız)
      const allProductsResponse = await fetch('/api/products?limit=999999');
      if (!allProductsResponse.ok) {
        throw new Error('Ürünler alınamadı');
      }
      
      const allProductsData = await allProductsResponse.json();
      const allProducts = allProductsData.success ? allProductsData.data : [];
      
      // Sadece Dinamik etiketli ürünleri filtrele
      const dinamikProducts = allProducts.filter((product: Product) => 
        product.supplier_tags?.includes('Dinamik')
      );
      
      // Dinamik ürünleri güncelleme tarihine göre sırala (en eskiden en yeniye)
      const sortedProducts = [...dinamikProducts].sort((a, b) => {
        const dateA = a.dinamik_last_updated ? new Date(a.dinamik_last_updated).getTime() : 0;
        const dateB = b.dinamik_last_updated ? new Date(b.dinamik_last_updated).getTime() : 0;
        return dateA - dateB; // En eski önce
      });
      
      setUpdateProgress({ current: 0, total: sortedProducts.length, success: 0, failed: 0, notFound: 0 });
      setUpdateStats({ successful: 0, failed: 0, notFound: 0 });
      
      const nonDinamikCount = allProducts.length - dinamikProducts.length;
      toast.info(`${sortedProducts.length} Dinamik etiketli ürün güncelleme için hazırlandı (${nonDinamikCount} ürün Dinamik etiketli olmadığı için atlandı)`);
      
      let successCount = 0;
      let failedCount = 0;
      let notFoundCount = 0;
      
      for (let i = 0; i < sortedProducts.length; i++) {
        // useRef ile kontrol et - React state'ine bağımlı değil
        if (!shouldContinueUpdating.current) {
          toast.info('Güncelleme kullanıcı tarafından durduruldu');
          break;
        }
        
        const product = sortedProducts[i];
        setCurrentUpdatingProduct(product.stok_kodu);
        
        try {
          // Dinamik scraper endpoint'ini çağır
          const response = await fetch('/api/suppliers/dinamik/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              productId: product.id,
              stockCode: product.stok_kodu
            })
          });
          
          const result = await response.json();
          
          // DEBUG: Backend'den dönen response'u logla
          console.log(`[DEBUG] ${product.stok_kodu} için backend response:`, {
            status: response.status,
            ok: response.ok,
            result: result
          });
          
          if (response.ok && result.success) {
            // Backend'den dönen response yapısını kontrol et
            // isAvailable: false durumunu kontrol et (Bu Tedarikçide Yok)
            if (result.data && (result.data.message === 'Bu Tedarikçide Yok' || result.data.isAvailable === false)) {
              notFoundCount++;
              setUpdateStats(prev => ({ ...prev, notFound: prev.notFound + 1 }));
              toast.warning(`${product.stok_kodu} - Bu Tedarikçide Yok (${i + 1}/${sortedProducts.length})`);
              console.log(`[DEBUG] ${product.stok_kodu} - Bu Tedarikçide Yok olarak işlendi`);
            } else {
              successCount++;
              setUpdateStats(prev => ({ ...prev, successful: prev.successful + 1 }));
              toast.success(`${product.stok_kodu} başarıyla güncellendi (${i + 1}/${sortedProducts.length})`);
              console.log(`[DEBUG] ${product.stok_kodu} - Başarılı olarak işlendi, result.data:`, result.data);
            }
          } else {
            // Check for CAPTCHA timeout or manual intervention required
            if (result.requiresManualIntervention || result.message?.includes('CAPTCHA') || result.message?.includes('timeout')) {
              setIsCaptchaWaiting(true);
              shouldContinueUpdating.current = false;
              toast.error('⚠️ CAPTCHA Doğrulaması Gerekiyor!', {
                duration: 15000,
                description: 'Scraper GUI\'de CAPTCHA çözümü bekleniyor. Lütfen Python uygulamasını kontrol edin.'
              });
              toast.info('🛑 Güncelleme İşlemi Durduruldu', {
                duration: 10000,
                description: 'CAPTCHA çözülene kadar yeni istekler gönderilmeyecek.'
              });
              break; // Döngüyü tamamen durdur
            } else {
              throw new Error(result.message || result.error || 'API hatası');
            }
          }
        } catch (error) {
          // Check if it's a timeout error (CAPTCHA related)
          if ((error as Error).message?.includes('timeout') || (error as Error).message?.includes('CAPTCHA')) {
            setIsCaptchaWaiting(true);
            shouldContinueUpdating.current = false;
            toast.error('⚠️ CAPTCHA Timeout!', {
              duration: 15000,
              description: 'Scraper GUI\'de CAPTCHA çözümü bekleniyor. 2 dakika içinde çözülmedi.'
            });
            toast.info('🛑 Güncelleme İşlemi Durduruldu', {
              duration: 10000,
              description: 'CAPTCHA çözülene kadar yeni istekler gönderilmeyecek.'
            });
            break; // Döngüyü tamamen durdur
          } else {
            failedCount++;
            setUpdateStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            console.error(`Error updating product ${product.stok_kodu}:`, error);
            toast.error(`${product.stok_kodu} güncellenirken hata oluştu - devam ediliyor`);
          }
        }
        
        // Progress güncelle
        setUpdateProgress({ 
          current: i + 1, 
          total: sortedProducts.length, 
          success: successCount, 
          failed: failedCount,
          notFound: notFoundCount
        });
        
        // Rate limiting için bekle (sadece son ürün değilse)
        if (i < sortedProducts.length - 1 && shouldContinueUpdating.current) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Final sonuç mesajı
      if (shouldContinueUpdating.current) {
        toast.success(`Güncelleme tamamlandı! Başarılı: ${updateStats.successful}, Bu Tedarikçide Yok: ${updateStats.notFound}, Başarısız: ${updateStats.failed}`);
      }
      
    } catch (error) {
      console.error('Error in updateDinamikProducts:', error);
      toast.error('Dinamik ürün güncelleme sırasında genel hata oluştu');
    } finally {
      setUpdating(false);
      setUpdateCompleted(true);
      setCurrentUpdatingProduct(null);
      setIsCaptchaWaiting(false); // CAPTCHA bekleme durumunu sıfırla
      shouldContinueUpdating.current = false;
      
      // Güncelleme tamamlandıktan sonra ürün listesini yeniden çek
      await fetchProducts();
    }
  };

  const updatePrices = async () => {
    try {
      setUpdating(true);
      setUpdateCompleted(false);
      shouldContinueUpdating.current = true;
      
      // Tüm ürünleri al (pagination'dan bağımsız)
      const allProductsResponse = await fetch('/api/products?limit=999999');
      if (!allProductsResponse.ok) {
        throw new Error('Ürünler alınamadı');
      }
      
      const allProductsData = await allProductsResponse.json();
      const allProducts = allProductsData.success ? allProductsData.data : [];
      
      // Dinamik etiketi olmayan ürünleri filtrele (bunlar güncellenmeli)
      const productsToUpdate = allProducts.filter((product: Product) => 
        !product.supplier_tags?.includes('Dinamik')
      );
      
      // Ürünleri dinamik_last_updated tarihine göre sırala (en eskiden en yeniye)
      const sortedProducts = [...productsToUpdate].sort((a, b) => {
        const dateA = a.dinamik_last_updated ? new Date(a.dinamik_last_updated).getTime() : 0;
        const dateB = b.dinamik_last_updated ? new Date(b.dinamik_last_updated).getTime() : 0;
        return dateA - dateB; // En eski önce
      });
      
      setUpdateProgress({ current: 0, total: sortedProducts.length, success: 0, failed: 0, notFound: 0 });
      setUpdateStats({ successful: 0, failed: 0, notFound: 0 });
      
      const filteredCount = allProducts.length - sortedProducts.length;
      toast.info(`${sortedProducts.length} ürün güncelleme için hazırlandı (${filteredCount} ürün Dinamik etiketli olduğu için atlandı)`);
      
      let successCount = 0;
      let failedCount = 0;
      let notFoundCount = 0;
      
      for (let i = 0; i < sortedProducts.length; i++) {
        // useRef ile kontrol et - React state'ine bağımlı değil
        if (!shouldContinueUpdating.current) {
          toast.info('Güncelleme kullanıcı tarafından durduruldu');
          break;
        }
        
        const product = sortedProducts[i];
        setCurrentUpdatingProduct(product.stok_kodu);
        
        try {
          // Dinamik scraper endpoint'ini çağır
          const response = await fetch('/api/suppliers/dinamik/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              productId: product.id,
              stockCode: product.stok_kodu
            })
          });
          
          const result = await response.json();
          
          // DEBUG: Backend'den dönen response'u logla
          console.log(`[DEBUG] ${product.stok_kodu} için backend response:`, {
            status: response.status,
            ok: response.ok,
            result: result
          });
          
          if (response.ok && result.success) {
            // Backend'den dönen response yapısını kontrol et
            // isAvailable: false durumunu kontrol et (Bu Tedarikçide Yok)
            if (result.data && (result.data.message === 'Bu Tedarikçide Yok' || result.data.isAvailable === false)) {
              notFoundCount++;
              setUpdateStats(prev => ({ ...prev, notFound: prev.notFound + 1 }));
              toast.warning(`${product.stok_kodu} - Bu Tedarikçide Yok (${i + 1}/${sortedProducts.length})`);
              console.log(`[DEBUG] ${product.stok_kodu} - Bu Tedarikçide Yok olarak işlendi`);
            } else {
              successCount++;
              setUpdateStats(prev => ({ ...prev, successful: prev.successful + 1 }));
              toast.success(`${product.stok_kodu} başarıyla güncellendi (${i + 1}/${sortedProducts.length})`);
              console.log(`[DEBUG] ${product.stok_kodu} - Başarılı olarak işlendi, result.data:`, result.data);
            }
          } else {
            // Check for CAPTCHA timeout or manual intervention required
            if (result.requiresManualIntervention || result.message?.includes('CAPTCHA') || result.message?.includes('timeout')) {
              setIsCaptchaWaiting(true);
              shouldContinueUpdating.current = false;
              toast.error('⚠️ CAPTCHA Doğrulaması Gerekiyor!', {
                duration: 15000,
                description: 'Scraper GUI\'de CAPTCHA çözümü bekleniyor. Lütfen Python uygulamasını kontrol edin.'
              });
              toast.info('🛑 Güncelleme İşlemi Durduruldu', {
                duration: 10000,
                description: 'CAPTCHA çözülene kadar yeni istekler gönderilmeyecek.'
              });
              break; // Döngüyü tamamen durdur
            } else {
              throw new Error(result.message || result.error || 'API hatası');
            }
          }
        } catch (error) {
          // Check if it's a timeout error (CAPTCHA related)
          if ((error as Error).message?.includes('timeout') || (error as Error).message?.includes('CAPTCHA')) {
            setIsCaptchaWaiting(true);
            shouldContinueUpdating.current = false;
            toast.error('⚠️ CAPTCHA Timeout!', {
              duration: 15000,
              description: 'Scraper GUI\'de CAPTCHA çözümü bekleniyor. 2 dakika içinde çözülmedi.'
            });
            toast.info('🛑 Güncelleme İşlemi Durduruldu', {
              duration: 10000,
              description: 'CAPTCHA çözülene kadar yeni istekler gönderilmeyecek.'
            });
            break; // Döngüyü tamamen durdur
          } else {
            failedCount++;
            setUpdateStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            console.error(`Error updating product ${product.stok_kodu}:`, error);
            toast.error(`${product.stok_kodu} güncellenirken hata oluştu - devam ediliyor`);
          }
        }
        
        // Progress güncelle
        setUpdateProgress({ 
          current: i + 1, 
          total: sortedProducts.length, 
          success: successCount, 
          failed: failedCount,
          notFound: notFoundCount
        });
        
        // Rate limiting için bekle (sadece son ürün değilse)
        if (i < sortedProducts.length - 1 && shouldContinueUpdating.current) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      // Final sonuç mesajı
      if (shouldContinueUpdating.current) {
        toast.success(`Güncelleme tamamlandı! Başarılı: ${updateStats.successful}, Bu Tedarikçide Yok: ${updateStats.notFound}, Başarısız: ${updateStats.failed}`);
      }
      
    } catch (error) {
      console.error('Error in updatePrices:', error);
      toast.error('Dinamik ürün güncelleme sırasında genel hata oluştu');
    } finally {
      setUpdating(false);
      setUpdateCompleted(true);
      setCurrentUpdatingProduct(null);
      setIsCaptchaWaiting(false); // CAPTCHA bekleme durumunu sıfırla
      shouldContinueUpdating.current = false;
      
      // Güncelleme tamamlandıktan sonra ürün listesini yeniden çek
      await fetchProducts();
    }
  };

  const stopUpdate = () => {
    shouldContinueUpdating.current = false;
    setUpdating(false);
    setUpdateCompleted(true);
    setCurrentUpdatingProduct(null);
    setIsCaptchaWaiting(false); // CAPTCHA bekleme durumunu sıfırla
    toast.info('Güncelleme durduruluyor...');
  };

  const updateSingleProductWithScraper = async (product: Product) => {
    setScrapingProduct(product.id);
    
    try {
      // Hangi tedarikçinin ürünü olduğunu tespit et
      let supplierEndpoint = '/api/suppliers/dinamik/scrape';
      let supplierName = 'Dinamik';
      
      if (product.supplier_tags) {
        if (product.supplier_tags.includes('Dinamik')) {
          supplierEndpoint = '/api/suppliers/dinamik/scrape';
          supplierName = 'Dinamik';
        } else if (product.supplier_tags.includes('Doğuş')) {
          supplierEndpoint = '/api/suppliers/dogus/scrape';
          supplierName = 'Doğuş';
        }
      }
      
      // Try direct Python scraper first, then fallback to backend
      let response;
      try {
        // Direct call to Python scraper (port 5000)
        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 10000);
        
        response = await fetch(supplierEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            productId: product.id,
            stockCode: product.stok_kodu
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
             supplier: supplierName,
             productId: product.id
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
        let foundAtSupplier = true;
        
        // Handle different response formats (direct scraper vs backend proxy)
        if (result.success) {
          if (result.data && typeof result.data === 'object') {
            // Backend proxy response format: { success: true, data: { price, stock, isAvailable } }
            scrapedData = result.data;
          } else if (result.price !== undefined && result.stock !== undefined) {
            // Direct Python scraper response format: { success: true, price, stock, isAvailable }
            scrapedData = {
              price: result.price,
              stock: result.stock,
              isAvailable: result.isAvailable
            };
          } else {
            throw new Error('Scraper yanıtında fiyat veya stok bilgisi bulunamadı');
          }
          
          // Check if product was found at supplier
          if (result.foundAtSupplier === false || result.message === 'Bu Tedarikçide Yok') {
            foundAtSupplier = false;
            scrapedData = {
              price: 0,
              stock: 0,
              isAvailable: false,
              message: 'Bu Tedarikçide Yok'
            };
          }
        } else {
          // CAPTCHA durumunu özel olarak handle et
          if (result.requiresManualIntervention) {
            throw new Error(`CAPTCHA Doğrulaması Gerekiyor: ${result.message || result.error}`);
          }
          throw new Error(result.error || result.message || 'Scraper bot\'tan hata alındı');
        }
          
        // Veritabanına kaydet (sadece ürün bulunduğunda)
        if (foundAtSupplier) {
          try {
            const updateHeaders: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            
            if (token) {
              updateHeaders['Authorization'] = `Bearer ${token}`;
            }
            
            const updateResponse = await fetch('/api/products/update-supplier-data', {
              method: 'POST',
              headers: updateHeaders,
              body: JSON.stringify({
                productId: product.id,
                supplier: supplierName,
                price: scrapedData.price,
                stock: scrapedData.stock,
                stockStatus: scrapedData.isAvailable ? 'instock' : 'outofstock'
              })
            });
            
            if (!updateResponse.ok) {
              console.error('Failed to save to database:', await updateResponse.text());
              throw new Error('Veritabanına kaydetme başarısız');
            }
          } catch (error) {
            console.error('Database update error:', error);
            throw error;
          }
        }
        
        // Ürün listesini güncelle - sadece ürün bulunduğunda backend'den güncellenmiş ürün bilgilerini al
        if (foundAtSupplier) {
          try {
            const updatedProductResponse = await fetch(`/api/products/${product.id}`, {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
            });
            
            if (updatedProductResponse.ok) {
              const updatedProductData = await updatedProductResponse.json();
              if (updatedProductData.success) {
                // Ürün listesini güncellenmiş verilerle güncelle
                setProducts(prev => prev.map(p => {
                  if (p.id === product.id) {
                    return {
                      ...p,
                      ...updatedProductData.data,
                      // Etiketlerin doğru şekilde güncellenmesini sağla
                      supplier_tags: updatedProductData.data.supplier_tags || p.supplier_tags
                    };
                  }
                  return p;
                }));
              }
            }
        } catch (error) {
          console.warn('Failed to fetch updated product data:', error);
          // Fallback: manuel güncelleme
          setProducts(prev => prev.map(p => {
            if (p.id === product.id) {
              const updatedProduct = { ...p };
              const now = new Date().toISOString();
              
              if (foundAtSupplier) {
                // Ürün bulundu - fiyat ve stok güncelle
                if (supplierName === 'Dinamik') {
                  updatedProduct.dinamik_price = scrapedData.price;
                  updatedProduct.dinamik_stock = scrapedData.stock;
                  updatedProduct.dinamik_last_updated = now;
                } else if (supplierName === 'Doğuş') {
                  updatedProduct.dogus_price = scrapedData.price;
                  updatedProduct.dogus_stock = scrapedData.stock;
                  updatedProduct.dogus_last_updated = now;
                } else {
                  updatedProduct.dinamik_price = scrapedData.price;
                  updatedProduct.dinamik_stock = scrapedData.stock;
                  updatedProduct.dinamik_last_updated = now;
                }
                
                // Etiket ekleme (eğer mevcut değilse)
                if (!updatedProduct.supplier_tags?.includes(supplierName)) {
                  updatedProduct.supplier_tags = [...(updatedProduct.supplier_tags || []), supplierName];
                }
              } else {
                // Ürün bulunamadı - sadece güncelleme tarihini güncelle
                if (supplierName === 'Dinamik') {
                  updatedProduct.dinamik_last_updated = now;
                } else if (supplierName === 'Doğuş') {
                  updatedProduct.dogus_last_updated = now;
                } else {
                  updatedProduct.dinamik_last_updated = now;
                }
              }
              
              return updatedProduct;
            }
            return p;
          }));
        }
        }
        
        // Success - no toast here, handled by parent function
        return scrapedData;
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

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const removeSupplierData = async (productId: number, stockCode: string) => {
    try {
      const response = await fetch(`/api/suppliers/dinamik/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Ürün listesini güncelle - tedarikçi bilgilerini kaldır
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              dinamik_price: undefined,
              dinamik_stock: undefined,
              dinamik_last_updated: undefined,
              supplier_tags: p.supplier_tags?.filter(tag => tag !== 'Dinamik') || []
            };
          }
          return p;
        }));

        toast.success(`${stockCode} ürününün Dinamik tedarikçi bilgileri silindi`);
        return result.data;
      } else {
        throw new Error(result.message || result.error || 'Tedarikçi bilgileri silinemedi');
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Bilinmeyen hata';
      toast.error(`Hata: ${errorMessage}`);
       throw error;
     }
   };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination(prev => ({ ...prev, page: prev.page - 1 }));
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: prev.page + 1 }));
    }
  };

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return { value: '-', color: 'text-gray-400 dark:text-gray-500', bgColor: '' };
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    const formatted = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(numPrice);
    
    return {
      value: formatted,
      color: numPrice > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500',
      bgColor: numPrice > 0 ? 'bg-green-50 dark:bg-green-900/20' : ''
    };
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return { value: '-', color: 'text-gray-400 dark:text-gray-500', isRecent: false };
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formatted = date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return {
      value: formatted,
      color: diffDays <= 1 ? 'text-green-600 dark:text-green-400' : 
             diffDays <= 7 ? 'text-blue-600 dark:text-blue-400' : 
             'text-gray-600 dark:text-gray-400',
      isRecent: diffDays <= 7
    };
  };

  const getStats = () => {
    const totalProducts = pagination.total;
    const withDinamikPrice = products.filter(p => p.dinamik_price).length;
    const inStock = products.filter(p => p.dinamik_stock && p.dinamik_stock > 0).length;
    const recentlyUpdated = products.filter(p => {
      if (!p.dinamik_last_updated) return false;
      const updateDate = new Date(p.dinamik_last_updated);
      const daysDiff = (Date.now() - updateDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }).length;
    return { totalProducts, withDinamikPrice, inStock, recentlyUpdated };
  };

  const { totalProducts, withDinamikPrice, inStock, recentlyUpdated } = getStats();

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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/suppliers"
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dinamik Tedarikçi</h1>
            <p className="text-gray-600 dark:text-gray-400">Dinamik firmasından fiyat ve stok bilgilerini yönetin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Yenileniyor...' : 'Yenile'}
          </button>
          {updating ? (
            <Button
              onClick={stopUpdate}
              variant="destructive"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircle className="h-4 w-4" />
              Güncellemeyi Durdur
            </Button>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <Button
                  onClick={updatePrices}
                  disabled={loading || !systemStatus?.dinamikScraper?.connected || systemStatus?.dinamikScraper?.status !== 'online' || isCaptchaWaiting}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tüm Ürünlerle Güncelleme Yap
                </Button>
                <Button
                  onClick={updateDinamikProducts}
                  disabled={loading || products.length === 0 || !systemStatus?.dinamikScraper?.connected || systemStatus?.dinamikScraper?.status !== 'online' || isCaptchaWaiting}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Target className="h-4 w-4" />
                  Sadece Dinamik Ürünlerini Güncelle
                </Button>
              </div>
              {(!systemStatus?.dinamikScraper?.connected || systemStatus?.dinamikScraper?.status !== 'online') && !isCaptchaWaiting && (
                <span className="text-sm text-red-600 font-medium">
                  {!systemStatus?.dinamikScraper?.connected 
                    ? 'Scraper Bot Kapalı !' 
                    : 'Tarayıcı Başlatılmamış !'}
                </span>
              )}
              {isCaptchaWaiting && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                  <div className="text-sm text-orange-600 font-medium">
                    ⚠️ CAPTCHA Bekleniyor - Scraper GUI'yi kontrol edin!
                  </div>
                  <div className="text-xs text-orange-500">
                    Python scraper uygulamasında CAPTCHA çözümü tamamlandıktan sonra aşağıdaki butona tıklayın.
                  </div>
                  <Button
                    onClick={() => {
                      setIsCaptchaWaiting(false);
                      toast.success('CAPTCHA durumu sıfırlandı. Güncelleme işlemini yeniden başlatabilirsiniz.');
                    }}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ CAPTCHA Çözüldü - Devam Et
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>



      {/* Update Progress */}
      {(updating || updateCompleted) && (
        <Card className="border-blue-800 bg-gradient-to-r from-blue-800 to-blue-900">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {updating ? (
                    <Bot className="h-5 w-5 text-white animate-pulse" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-white" />
                  )}
                  <span className="text-sm font-semibold text-white">
                    {updating ? 'Güncelleme İlerlemesi' : 'Güncelleme Tamamlandı'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 dark:border-white">
                    {updateProgress.current} / {updateProgress.total}
                  </Badge>
                  {updating && (
                    <Button
                      onClick={stopUpdate}
                      variant="destructive"
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <StopCircle className="h-3 w-3 mr-1 text-white" />
                      Durdur
                    </Button>
                  )}
                  {updateCompleted && (
                    <button
                      onClick={() => setUpdateCompleted(false)}
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
                  style={{ width: `${updateProgress.total > 0 ? (updateProgress.current / updateProgress.total) * 100 : 0}%` }}
                ></div>
              </div>
              
              {/* Success/Failure Stats */}
              <div className="flex items-center gap-4 p-3 rounded-lg" style={{backgroundColor: '#fff'}}>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-800">
                    Başarılı: <span className="font-bold">{updateStats.successful}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-800">
                    Bu Tedarikçide Yok: <span className="font-bold">{updateStats.notFound}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-800">
                    Başarısız: <span className="font-bold">{updateStats.failed}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-800">
                    Toplam: <span className="font-bold">{updateStats.successful + updateStats.notFound + updateStats.failed}</span>
                  </span>
                </div>
              </div>
              
              {currentUpdatingProduct && updating && (
                <div className="flex items-center gap-2 p-3 bg-red-600 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-white animate-spin" />
                  <p className="text-sm text-white">
                    Güncelleniyor: <span className="font-semibold">{currentUpdatingProduct}</span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ürün Listesi</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Dinamik tedarikçisinden gelen ürün fiyat ve stok bilgileri
              {currentUpdatingProduct && (
                <span className="ml-2 bg-red-600 text-white px-2 py-1 rounded font-medium">
                  • Güncelleniyor: {currentUpdatingProduct}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium">
            {dinamikProducts.length} Dinamik ürünü ({pagination.total} toplam ürün)
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-12 w-12 animate-spin text-purple-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ürünler Yükleniyor</h3>
            <p className="text-gray-600 dark:text-gray-400">Lütfen bekleyiniz...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ürün Bulunamadı</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {searchTerm ? 'Arama kriterlerinize uygun ürün bulunamadı. Farklı anahtar kelimeler deneyin.' : 'Henüz ürün bulunmuyor. Ürünleri yüklemek için yenile butonunu kullanın.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 first:rounded-tl-2xl">Stok Kodu</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">Ürün Adı</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">Mevcut Fiyat/Stok</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">Dinamik Fiyat/Stok</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">Tedarikçi Etiketleri</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">Son Güncelleme</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50">WooCommerce</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800/50 last:rounded-tr-2xl">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {dinamikProducts.map((product, index) => (
                  <tr 
                    key={product.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      currentUpdatingProduct === product.stok_kodu 
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500' 
                        : index % 2 === 0 
                          ? 'bg-white dark:bg-gray-900' 
                          : 'bg-gray-50/30 dark:bg-gray-800/20'
                    }`}
                  >
                    <td className="py-4 px-4 font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                      {product.stok_kodu}
                    </td>
                    <td className="py-4 px-4">
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 dark:text-white truncate" title={product.urun_adi} style={{fontSize: '14px'}}>
                          {product.urun_adi.split(' ').slice(0, 4).join(' ')}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPrice(product.regular_price).value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className={product.stok_miktari > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Stok: {product.stok_miktari}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatPrice(product.dinamik_price).value}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          <span className={(product.dinamik_stock || 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            Stok: {product.dinamik_stock || 0}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {product.supplier_tags && product.supplier_tags.length > 0 ? (
                          product.supplier_tags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Etiket yok</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className={formatDate(product.dinamik_last_updated).color}>
                          {formatDate(product.dinamik_last_updated).value}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className={formatDate(product.woo_last_update).color}>
                          {formatDate(product.woo_last_update).value}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                           onClick={() => updateSingleProductWithScraper(product)}
                           disabled={scrapingProduct === product.id || updating || !systemStatus?.dinamikScraper?.connected || isCaptchaWaiting}
                           className="inline-flex items-center justify-center px-2 py-2 border border-purple-200 dark:border-purple-700 rounded-lg text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                           title={scrapingProduct === product.id ? 'Güncelleniyor...' : isCaptchaWaiting ? 'CAPTCHA Bekleniyor' : 'Bot ile Güncelle'}
                         >
                           {scrapingProduct === product.id ? (
                             <RefreshCw className="h-4 w-4 animate-spin" />
                           ) : (
                             <Bot className="h-4 w-4" />
                           )}
                         </button>
                        
                        {/* Silme butonu - sadece Dinamik fiyatı varsa göster */}
                        {product.dinamik_price && (
                          <button
                            onClick={() => removeSupplierData(product.id, product.stok_kodu)}
                            disabled={scrapingProduct === product.id || updating}
                            className="inline-flex items-center gap-1 px-2 py-2 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Dinamik tedarikçi bilgilerini sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Sayfa {pagination.page} / {pagination.totalPages} ({pagination.total} toplam ürün)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={pagination.page <= 1}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Önceki
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                            pagination.page === pageNum
                              ? 'bg-purple-600 text-white'
                              : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}