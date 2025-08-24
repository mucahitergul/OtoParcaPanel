'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { productApi } from '@/lib/api';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Package,
  DollarSign,
  Hash,
  FileText,
  Image as ImageIcon,
  Tag,
  Warehouse,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
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
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  created_at: string;
  updated_at: string;
}

interface ProductFormData {
  urun_adi: string;
  stok_kodu: string;
  fiyat: number;
  stok_miktari: number;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  description?: string;
  short_description?: string;
  regular_price?: number;
  sale_price?: number;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    urun_adi: '',
    stok_kodu: '',
    fiyat: 0,
    stok_miktari: 0,
    stock_status: 'instock',
    description: '',
    short_description: '',
    regular_price: 0,
    sale_price: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productApi.getProduct(parseInt(productId));
      if (response.data.success) {
        const productData = response.data.data;
        setProduct(productData);
        setFormData({
          urun_adi: productData.urun_adi || '',
          stok_kodu: productData.stok_kodu || '',
          fiyat: productData.fiyat || 0,
          stok_miktari: productData.stok_miktari || 0,
          stock_status: productData.stock_status || 'instock',
          description: productData.description || '',
          short_description: productData.short_description || '',
          regular_price: productData.regular_price || 0,
          sale_price: productData.sale_price || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Ürün bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.urun_adi.trim()) {
      newErrors.urun_adi = 'Ürün adı gereklidir';
    }

    if (!formData.stok_kodu.trim()) {
      newErrors.stok_kodu = 'Stok kodu gereklidir';
    }

    if (formData.fiyat <= 0) {
      newErrors.fiyat = 'Fiyat 0\'dan büyük olmalıdır';
    }

    if (formData.stok_miktari < 0) {
      newErrors.stok_miktari = 'Stok miktarı negatif olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Lütfen form hatalarını düzeltin');
      return;
    }

    try {
      setSaving(true);
      const response = await productApi.updateProduct(parseInt(productId), formData);
      
      if (response.data.success) {
        toast.success('Ürün başarıyla güncellendi!');
        router.push(`/products/${productId}`);
      } else {
        toast.error('Ürün güncellenirken hata oluştu');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Ürün güncellenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };



  useEffect(() => {
    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-gray-600 dark:text-gray-400">Ürün bilgileri yükleniyor...</span>
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">Aradığınız ürün bulunamadı veya erişim izniniz yok.</p>
          <Link
            href="/products"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Ürünlere Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href={`/products/${productId}`}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürün Düzenle</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {product.urun_adi} - {product.stok_kodu}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Package className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Temel Bilgiler</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ürün Adı *
                </label>
                <input
                  type="text"
                  value={formData.urun_adi}
                  onChange={(e) => handleInputChange('urun_adi', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    errors.urun_adi ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ürün adını girin"
                />
                {errors.urun_adi && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.urun_adi}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stok Kodu *
                </label>
                <input
                  type="text"
                  value={formData.stok_kodu}
                  onChange={(e) => handleInputChange('stok_kodu', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    errors.stok_kodu ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Stok kodunu girin"
                />
                {errors.stok_kodu && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stok_kodu}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fiyat (₺) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fiyat}
                  onChange={(e) => handleInputChange('fiyat', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    errors.fiyat ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0.00"
                />
                {errors.fiyat && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.fiyat}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stok Miktarı *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stok_miktari}
                  onChange={(e) => handleInputChange('stok_miktari', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors ${
                    errors.stok_miktari ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="0"
                />
                {errors.stok_miktari && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stok_miktari}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stok Durumu
                </label>
                <select
                  value={formData.stock_status}
                  onChange={(e) => handleInputChange('stock_status', e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                >
                  <option value="instock">Stokta</option>
                  <option value="outofstock">Stok Yok</option>
                  <option value="onbackorder">Sipariş Üzerine</option>
                </select>
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Açıklamalar</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kısa Açıklama
                </label>
                <textarea
                  rows={3}
                  value={formData.short_description}
                  onChange={(e) => handleInputChange('short_description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Ürünün kısa açıklamasını girin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detaylı Açıklama
                </label>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="Ürünün detaylı açıklamasını girin"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Fiyatlandırma</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Normal Fiyat (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.regular_price}
                  onChange={(e) => handleInputChange('regular_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  İndirimli Fiyat (₺)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_price}
                  onChange={(e) => handleInputChange('sale_price', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>



          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href={`/products/${productId}`}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              İptal
            </Link>
            
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Değişiklikleri Kaydet
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}