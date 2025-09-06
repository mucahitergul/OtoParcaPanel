'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  RefreshCw, 
  Search, 
  Package, 
  ExternalLink, 
  Building2, 
  Filter,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import AdvancedPagination from '@/components/AdvancedPagination';

interface Product {
  id: number;
  stok_kodu: string;
  urun_adi: string;
  fiyat: number | string;
  regular_price: number | string;
  stok_miktari: number;
  dinamik_price?: number | string;
  dinamik_stock?: number;
  dinamik_last_updated?: string;
  basbug_price?: number | string;
  basbug_stock?: number;
  basbug_last_updated?: string;
  dogus_price?: number | string;
  dogus_stock?: number;
  dogus_last_updated?: string;
  woo_last_update?: string;
  supplier_tags?: string[];
}

export default function SuppliersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [applyingPrice, setApplyingPrice] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    fetchData();
    fetchAllProductsForStats();
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchData();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products?page=${pagination.page}&limit=${pagination.limit}&search=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        if (data.success) {
          setProducts(data.data || []);
          setPagination(prev => ({
            ...prev,
            total: data.pagination?.total || 0,
            totalPages: data.pagination?.totalPages || 1,
          }));
        }
      } else {
        toast.error('Veriler yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForStats = async () => {
    try {
      const response = await fetch('/api/products?limit=999999');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAllProducts(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching all products for stats:', error);
    }
  };

  const applyBestPrice = async (productId: number) => {
    try {
      setApplyingPrice(productId);
      const response = await fetch('/api/suppliers/select-best', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('En iyi fiyat başarıyla uygulandı!');
          // Update the product price in the state
          if (result.updatedPrice) {
            setProducts(prevProducts => 
              prevProducts.map(product => 
                product.id === productId 
                  ? { ...product, regular_price: result.updatedPrice }
                  : product
              )
            );
          }
        } else {
          toast.error('Fiyat uygulanırken hata oluştu');
        }
      } else {
        toast.error('Fiyat uygulanırken hata oluştu');
      }
    } catch (error) {
      console.error('Error applying best price:', error);
      toast.error('Fiyat uygulanırken hata oluştu');
    } finally {
      setApplyingPrice(null);
    }
  };

  // Remove filteredProducts since we're using server-side filtering

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return '-';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(numPrice);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getSupplierStats = () => {
    const dinamikCount = allProducts.filter(p => p.dinamik_price && Number(p.dinamik_price) > 0).length;
    const basbugCount = allProducts.filter(p => p.basbug_price && Number(p.basbug_price) > 0).length;
    // Doğuş için sadece etiket kontrolü yap - fiyat ve stok durumu önemli değil
    const dogusCount = allProducts.filter(p => {
      // Sadece supplier_tags içinde 'Doğuş' etiketi var mı kontrol et
      return p.supplier_tags && Array.isArray(p.supplier_tags) && p.supplier_tags.includes('Doğuş');
    }).length;
    return { dinamikCount, basbugCount, dogusCount };
  };

  const { dinamikCount, basbugCount, dogusCount } = getSupplierStats();

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tedarikçi Fiyatları</h1>
          <p className="text-gray-600 dark:text-gray-400">Tüm tedarikçi fiyatlarını karşılaştırın ve yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
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
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Ürün"
          value={pagination.total}
          icon={Package}
          color="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          title="Dinamik Fiyatları"
          value={dinamikCount}
          icon={CheckCircle}
          change={`%${allProducts.length > 0 ? Math.round((dinamikCount / allProducts.length) * 100) : 0}`}
          changeType="increase"
          color="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
        />
        <StatCard
          title="Başbuğ Fiyatları"
          value={basbugCount}
          icon={TrendingUp}
          change={`%${allProducts.length > 0 ? Math.round((basbugCount / allProducts.length) * 100) : 0}`}
          changeType="increase"
          color="bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400"
        />
        <StatCard
          title="Doğuş Fiyatları"
          value={dogusCount}
          icon={AlertCircle}
          change={`%${allProducts.length > 0 ? Math.round((dogusCount / allProducts.length) * 100) : 0}`}
          changeType="increase"
          color="bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Supplier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Dinamik</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{dinamikCount} ürün fiyatı</p>
              </div>
            </div>
          </div>
          <Link href="/suppliers/dinamik">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              <ExternalLink className="h-4 w-4 mr-2" />
              Detayları Görüntüle
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
                <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Başbuğ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{basbugCount} ürün fiyatı</p>
              </div>
            </div>
          </div>
          <Link href="/suppliers/basbug">
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <ExternalLink className="h-4 w-4 mr-2" />
              Detayları Görüntüle
            </Button>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Doğuş</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{dogusCount} ürün fiyatı</p>
              </div>
            </div>
          </div>
          <Link href="/suppliers/dogus">
            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              <ExternalLink className="h-4 w-4 mr-2" />
              Detayları Görüntüle
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black dark:text-black h-4 w-4" />
            <Input
              placeholder="Ürün ara (stok kodu, ürün adı)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 placeholder:text-black dark:placeholder:text-black"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-2 dark:text-white dark:border-white">
              <Filter className="h-4 w-4" />
              Filtreler
            </Button>
          </div>
        </div>
      </div>

      {/* Comprehensive Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tüm Tedarikçi Fiyatları Karşılaştırması</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Toplam {pagination.total} üründen {products.length} tanesi gösteriliyor</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Yükleniyor...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                  <TableHead className="font-semibold text-gray-900 dark:text-white">Stok Kodu</TableHead>
                  <TableHead className="font-semibold text-gray-900 dark:text-white">Ürün Adı</TableHead>
                  <TableHead className="font-semibold text-gray-900 dark:text-white">Mevcut Fiyat</TableHead>
                  <TableHead className="font-semibold text-gray-900 dark:text-white">Mevcut Stok</TableHead>
                  <TableHead className="font-semibold text-green-600 dark:text-green-400">Başbuğ Fiyat</TableHead>
                  <TableHead className="font-semibold text-green-600 dark:text-green-400">Başbuğ Stok</TableHead>
                  <TableHead className="font-semibold text-orange-600 dark:text-orange-400">Doğuş Fiyat</TableHead>
                  <TableHead className="font-semibold text-orange-600 dark:text-orange-400">Doğuş Stok</TableHead>
                  <TableHead className="font-semibold text-purple-600 dark:text-purple-400">Dinamik Fiyat</TableHead>
                  <TableHead className="font-semibold text-purple-600 dark:text-purple-400">Dinamik Stok</TableHead>
                  <TableHead className="font-semibold text-gray-900 dark:text-white">WooCommerce Tarihi</TableHead>
                  <TableHead className="font-semibold text-gray-900 dark:text-white">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product, index) => (
                  <TableRow 
                    key={product.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/25'
                    }`}
                  >
                    <TableCell className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {product.stok_kodu}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900 dark:text-white max-w-xs truncate">
                      {product.urun_adi}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900 dark:text-white">
                      {formatPrice(product.regular_price)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.stok_miktari > 0 ? 'default' : 'destructive'}
                        className={product.stok_miktari > 0 ? 
                          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : 
                          "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }
                      >
                        {product.stok_miktari}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-green-600 dark:text-green-400 font-medium">
                      {product.basbug_price ? formatPrice(product.basbug_price) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.basbug_stock !== null && product.basbug_stock !== undefined ? (
                        <Badge 
                          variant={product.basbug_stock > 0 ? 'default' : 'destructive'}
                          className={product.basbug_stock > 0 ? 
                            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : 
                            "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }
                        >
                          {product.basbug_stock}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-orange-600 dark:text-orange-400 font-medium">
                      {product.dogus_price ? formatPrice(product.dogus_price) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.dogus_stock !== null && product.dogus_stock !== undefined ? (
                        <Badge 
                          variant={product.dogus_stock > 0 ? 'default' : 'destructive'}
                          className={product.dogus_stock > 0 ? 
                            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : 
                            "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }
                        >
                          {product.dogus_stock}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-purple-600 dark:text-purple-400 font-medium">
                      {product.dinamik_price ? formatPrice(product.dinamik_price) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {product.dinamik_stock !== null && product.dinamik_stock !== undefined ? (
                        <Badge 
                          variant={product.dinamik_stock > 0 ? 'default' : 'destructive'}
                          className={product.dinamik_stock > 0 ? 
                            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : 
                            "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }
                        >
                          {product.dinamik_stock}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(product.woo_last_update)}
                    </TableCell>
                    <TableCell>
                       <Button
                         size="sm"
                         variant="outline"
                         className="text-xs px-2 py-1 h-7"
                         onClick={() => applyBestPrice(product.id)}
                         disabled={applyingPrice === product.id}
                       >
                         {applyingPrice === product.id ? (
                           <>
                             <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                             Uygulanıyor...
                           </>
                         ) : (
                           'En İyi Fiyatı Uygula'
                         )}
                       </Button>
                     </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Ürün bulunamadı</h3>
            <p className="text-gray-600 dark:text-gray-400">Arama kriterlerinize uygun ürün bulunamadı.</p>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && products.length > 0 && (
          <div className="mt-6">
            <AdvancedPagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              showPageSizeSelector={true}
              showJumpToPage={true}
              className="justify-center"
            />
          </div>
        )}
      </div>
    </div>
  );
}