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
} from 'lucide-react';
import Link from 'next/link';

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
  description?: string;
  short_description?: string;
  last_sync_date?: string;
  sync_required: boolean;
  created_at: string;
  updated_at: string;
  supplier_prices?: SupplierPrice[];
  update_history?: UpdateHistory[];
}

interface SupplierPrice {
  id: number;
  toptanci_adi: 'Dinamik' | 'Başbuğ' | 'Doğuş';
  stok_durumu: 'instock' | 'outofstock' | 'onbackorder';
  fiyat: number;
  old_fiyat?: number;
  stok_miktari: number;
  son_guncelleme?: string;
  is_active: boolean;
}

interface UpdateHistory {
  id: number;
  toptanci_adi: string;
  update_type: string;
  eski_fiyat?: number;
  yeni_fiyat?: number;
  eski_stok?: number;
  yeni_stok?: number;
  eski_stok_durumu?: string;
  yeni_stok_durumu?: string;
  notes?: string;
  is_successful: boolean;
  guncelleme_tarihi: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = parseInt(params.id as string);

  const [product, setProduct] = useState<Product | null>(null);
  const [supplierPrices, setSupplierPrices] = useState<SupplierPrice[]>([]);
  const [updateHistory, setUpdateHistory] = useState<UpdateHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStock, setEditingStock] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [newStock, setNewStock] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [updating, setUpdating] = useState(false);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProduct(productId);
      if (response.data.success) {
        setProduct(response.data.data);
        setNewStock(response.data.data.stok_miktari);
        setNewPrice(response.data.data.fiyat);
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

  const fetchUpdateHistory = async () => {
    try {
      const response = await productApi.getUpdateHistory(productId, 20);
      if (response.data.success) {
        setUpdateHistory(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching update history:', error);
    }
  };

  const handleUpdateStock = async () => {
    try {
      setUpdating(true);
      const response = await productApi.updateStock(productId, newStock);
      if (response.data.success) {
        setProduct(response.data.data);
        setEditingStock(false);
        await fetchUpdateHistory();
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
        await fetchUpdateHistory();
        alert('Fiyat başarıyla güncellendi!');
      }
    } catch (error) {
      console.error('Error updating price:', error);
      alert('Fiyat güncellenirken hata oluştu!');
    } finally {
      setUpdating(false);
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
      (sp) => sp.stok_durumu === 'instock' && sp.is_active
    );
    if (availablePrices.length === 0) return null;
    return availablePrices.sort((a, b) => a.fiyat - b.fiyat)[0];
  };

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchSupplierPrices();
      fetchUpdateHistory();
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
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
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Fiyat</h3>
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
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatPrice(product.fiyat)}</p>
                      {product.regular_price && product.regular_price !== product.fiyat && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          {formatPrice(product.regular_price)}
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

              {/* Description */}
              {product.description && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Açıklama</h3>
                  <div
                    className="text-sm text-gray-600 dark:text-gray-400"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                </div>
              )}
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
                            getSupplierColor(supplier.toptanci_adi)
                          }`}>
                            {supplier.toptanci_adi}
                          </span>
                          {bestPrice?.id === supplier.id && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              En İyi Fiyat
                            </span>
                          )}
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getStockStatusColor(supplier.stok_durumu)
                        }`}>
                          {getStockStatusText(supplier.stok_durumu)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Fiyat</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            {formatPrice(supplier.fiyat)}
                          </p>
                          {supplier.old_fiyat && supplier.old_fiyat !== supplier.fiyat && (
                            <div className="flex items-center gap-1 mt-1">
                              {supplier.fiyat > supplier.old_fiyat ? (
                                <TrendingUp className="h-3 w-3 text-red-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-green-500" />
                              )}
                              <span className="text-xs text-gray-500">
                                {formatPrice(supplier.old_fiyat)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Stok</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{supplier.stok_miktari}</p>
                          {supplier.son_guncelleme && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {formatDate(supplier.son_guncelleme)}
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

            {/* Update History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Güncelleme Geçmişi</h3>
              {updateHistory.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Henüz güncelleme geçmişi bulunmuyor</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {updateHistory.slice(0, 10).map((history) => (
                    <div key={history.id} className="border-l-4 border-primary-500 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          getSupplierColor(history.toptanci_adi)
                        }`}>
                          {history.toptanci_adi}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(history.guncelleme_tarihi)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">{history.update_type}</p>
                      {history.eski_fiyat && history.yeni_fiyat && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Fiyat: {formatPrice(history.eski_fiyat)} → {formatPrice(history.yeni_fiyat)}
                        </p>
                      )}
                      {history.eski_stok !== null && history.yeni_stok !== null && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Stok: {history.eski_stok} → {history.yeni_stok}
                        </p>
                      )}
                      {!history.is_successful && (
                        <div className="flex items-center mt-1">
                          <AlertCircle className="h-3 w-3 text-red-500 mr-1" />
                          <span className="text-xs text-red-600">Başarısız</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}