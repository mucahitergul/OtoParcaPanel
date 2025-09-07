'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productApi } from '@/lib/api';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Edit,
  Save,
  X,
  Clock,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

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
  description?: string;
  short_description?: string;
  last_sync_date?: string;
  sync_required: boolean;
  created_at: string;
  updated_at: string;
  supplier_prices?: SupplierPrice[];
  supplier_tags?: string[];
}

interface SupplierPrice {
  id: number;
  supplier_name: 'Dinamik' | 'Başbuğ' | 'Doğuş';
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  price: number;
  old_price?: number;
  stock_quantity: number;
  last_updated?: string;
  is_active: boolean;
  is_available: boolean;
}



export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);

  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newStock, setNewStock] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [isTestingWooSync, setIsTestingWooSync] = useState(false);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProduct(productId);
      if (response.data.success) {
        setProduct(response.data.data);
        setNewStock(response.data.data.stok_miktari);
        setNewPrice(response.data.data.regular_price);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupplierPrices = async () => {
    try {
      const response = await productApi.getSupplierPrices(productId);
      if (response.data.success) {
        setSupplierPrices(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching supplier prices:', error);
    }
  };



  const handleUpdateStock = async () => {
    try {
      setUpdating(true);
      const response = await productApi.updateStock(productId, newStock);
      if (response.data.success) {
        setProduct(response.data.data);
        setEditingStock(false);

        alert('Stok başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Stok güncellenirken hata oluştu!');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePrice = async () => {
    try {
      setUpdating(true);
      const response = await productApi.updatePrice(productId, newPrice);
      if (response.data.success) {
        setProduct(response.data.data);
        setEditingPrice(false);

        alert('Fiyat başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Fiyat güncellenirken hata oluştu!');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirm('Bu ürünü kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      setDeleting(true);
      await productApi.deleteProduct(productId);
      alert('Ürün başarıyla silindi!');
      router.push('/products');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Ürün silinirken hata oluştu!');
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateSupplierTags = async () => {
    try {
      setIsUpdatingTags(true);
      const response = await fetch(`/api/products/${productId}/update-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh product data to get updated tags
          await fetchProduct();
          alert('Tedarikçi etiketleri başarıyla güncellendi!');
        } else {
          alert('Etiket güncellenirken hata oluştu!');
        }
      } else {
        alert('Etiket güncellenirken hata oluştu!');
      }
    } catch (error) {
      console.error('Error updating supplier tags:', error);
      alert('Etiket güncellenirken hata oluştu!');
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleTestWooSync = async () => {
    try {
      setIsTestingWooSync(true);
      const response = await fetch(`/api/products/${productId}/test-woo-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('WooCommerce senkronizasyon testi başarılı!');
        } else {
          alert('WooCommerce senkronizasyon testi başarısız: ' + (result.message || 'Bilinmeyen hata'));
        }
      } else {
        alert('WooCommerce senkronizasyon testi sırasında hata oluştu!');
      }
    } catch (error) {
      console.error('Error testing WooCommerce sync:', error);
      alert('WooCommerce senkronizasyon testi sırasında hata oluştu!');
    } finally {
      setIsTestingWooSync(false);
    }
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

  const getSupplierColor = (supplier: string) => {
    switch (supplier) {
      case 'Dinamik':
        return 'bg-blue-100 text-blue-800';
      case 'Başbuğ':
        return 'bg-purple-100 text-purple-800';
      case 'Doğuş':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBestSupplierPrice = () => {
    const availablePrices = supplierPrices.filter(
      (sp) => sp.stock_status === 'instock' && sp.is_active && sp.is_available
    );
    if (availablePrices.length === 0) return null;
    return availablePrices.sort((a, b) => a.price - b.price)[0];
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchSupplierPrices();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
          <span className="text-gray-500 dark:text-gray-400">Ürün yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ürün Bulunamadı</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Aradığınız ürün mevcut değil.</p>
          <Link
            href="/products"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ürün Listesine Dön
          </Link>
        </div>
      </div>
    );
  }

  const bestPrice = getBestSupplierPrice();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ürün Listesine Dön
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{product.urun_adi}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Stok Kodu: {product.stok_kodu}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Details Card */}
            <div className="bg-white dark:bg-gray-800 shadow-soft p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center">
                  {product.images && product.images.length > 0 ? (
                    <img
                      src={product.images[0].src}
                      alt={product.images[0].alt || product.urun_adi}
                      className="h-20 w-20 rounded-lg object-cover mr-4"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center mr-4">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{product.urun_adi}</h2>
                    <p className="text-gray-600 dark:text-gray-400">Stok Kodu: {product.stok_kodu}</p>
                    {product.woo_product_id && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">WooCommerce ID: {product.woo_product_id}</p>
                    )}
                  </div>
                </div>
                {product.sync_required && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Senkron Gerekli
                  </span>
                )}
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Price */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">WooCommerce Normal Fiyat</h3>
                    <button
                      onClick={() => setEditingPrice(!editingPrice)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    >
                      {editingPrice ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </button>
                  </div>
                  {editingPrice ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                        step="0.01"
                      />
                      <button
                        onClick={handleUpdatePrice}
                        disabled={updating}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {formatPrice(product.regular_price)}
                      </p>
                      {product.sale_price && product.sale_price > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                          İndirimli: {formatPrice(product.sale_price)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Stock */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Stok</h3>
                    <button
                      onClick={() => setEditingStock(!editingStock)}
                      className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    >
                      {editingStock ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </button>
                  </div>
                  {editingStock ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                        min="0"
                      />
                      <button
                        onClick={handleUpdateStock}
                        disabled={updating}
                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{product.stok_miktari}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        getStockStatusColor(product.stock_status)
                      }`}>
                        {getStockStatusText(product.stock_status)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Categories */}
              {product.categories && product.categories.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Kategoriler</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplier Tags */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Tedarikçi Etiketleri</h3>
                  <div className="flex gap-2">
                    <button
                       onClick={handleUpdateSupplierTags}
                       disabled={isUpdatingTags}
                       className="inline-flex items-center px-3 py-1 text-xs font-medium bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                     >
                       {isUpdatingTags ? (
                         <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                       ) : (
                         <RefreshCw className="h-3 w-3 mr-1" />
                       )}
                       {isUpdatingTags ? 'Güncelleniyor...' : 'Etiketleri Güncelle'}
                     </button>
                     
                     {product.woo_product_id && (
                       <button
                         onClick={handleTestWooSync}
                         disabled={isTestingWooSync}
                         className="inline-flex items-center px-3 py-1 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                       >
                         {isTestingWooSync ? (
                           <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                         ) : (
                           <CheckCircle className="h-3 w-3 mr-1" />
                         )}
                         {isTestingWooSync ? 'Test Ediliyor...' : 'WooCommerce Sync Test'}
                       </button>
                     )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.supplier_tags && product.supplier_tags.length > 0 ? (
                    product.supplier_tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getSupplierColor(tag)
                        }`}
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Henüz etiket bulunmuyor. Etiketleri güncellemek için yukarıdaki butona tıklayın.
                    </span>
                  )}
                </div>
              </div>


            </div>

            {/* Supplier Prices */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Toptancı Fiyatları</h3>
              {supplierPrices.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Henüz toptancı fiyat bilgisi bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {supplierPrices.map((supplier) => (
                    <div
                      key={supplier.id}
                      className={`border rounded-lg p-4 ${
                        bestPrice?.id === supplier.id 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getSupplierColor(supplier.supplier_name)
                          }`}>
                            {supplier.supplier_name}
                          </span>
                          {bestPrice?.id === supplier.id && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              En İyi Fiyat
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStockStatusColor(supplier.stock_status)
                        }`}>
                          {getStockStatusText(supplier.stock_status)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Fiyat</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatPrice(supplier.price)}
                          </p>
                          {supplier.old_price && supplier.old_price !== supplier.price && (
                            <div className="flex items-center gap-1 mt-1">
                              {supplier.price > supplier.old_price ? (
                                <TrendingUp className="h-3 w-3 text-red-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-green-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {formatPrice(supplier.old_price)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Stok</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.stock_quantity}</p>
                          {supplier.last_updated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(supplier.last_updated)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İşlemler</h3>
              <div className="space-y-3">
                <Link
                  href={`/products/${productId}/edit`}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Ürünü Düzenle
                </Link>
                <button
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deleting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleting ? 'Siliniyor...' : 'Ürünü Sil'}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Özet</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Oluşturulma</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(product.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Son Güncelleme</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(product.updated_at)}
                  </span>
                </div>
                {product.last_sync_date && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Son Senkron</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDate(product.last_sync_date)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Toptancı Sayısı</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {supplierPrices.filter(sp => sp.is_active).length}
                  </span>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}