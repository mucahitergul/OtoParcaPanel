'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, Search, Package, ExternalLink, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Product {
  id: number;
  stok_kodu: string;
  urun_adi: string;
  fiyat: number | string;
  stok_miktari: number;
  dinamik_price?: number | string;
  dinamik_stock?: number;
  dinamik_last_updated?: string;
  basbuğ_price?: number | string;
  basbuğ_stock?: number;
  basbuğ_last_updated?: string;
  dogus_price?: number | string;
  dogus_stock?: number;
  dogus_last_updated?: string;
  woo_last_update?: string;
}

export default function SuppliersPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
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

  const getSupplierStats = () => {
    const dinamikCount = products.filter(p => p.dinamik_price !== undefined).length;
    const basbuğCount = products.filter(p => p.basbuğ_price !== undefined).length;
    const dogusCount = products.filter(p => p.dogus_price !== undefined).length;
    
    return { dinamikCount, basbuğCount, dogusCount };
  };

  const { dinamikCount, basbuğCount, dogusCount } = getSupplierStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Tedarikçi Fiyatları</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Tüm tedarikçi fiyatlarını karşılaştırın ve yönetin
            </p>
          </div>
        </div>

        {/* Supplier Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dinamik Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                  <CardTitle className="text-lg">Dinamik Tedarikçi</CardTitle>
                </div>
                <Link href="/suppliers/dinamik">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Detay
                  </Button>
                </Link>
              </div>
              <CardDescription>
                {dinamikCount} ürün için fiyat bilgisi mevcut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Toplam Ürün:</span>
                  <span className="font-medium text-blue-600">{dinamikCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                  <Badge variant="default" className="bg-blue-100 text-blue-800">Aktif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Başbuğ Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                  <CardTitle className="text-lg">Başbuğ Tedarikçi</CardTitle>
                </div>
                <Link href="/suppliers/basbuğ">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Detay
                  </Button>
                </Link>
              </div>
              <CardDescription>
                {basbuğCount} ürün için fiyat bilgisi mevcut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Toplam Ürün:</span>
                  <span className="font-medium text-green-600">{basbuğCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">Aktif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Doğuş Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                  <CardTitle className="text-lg">Doğuş Tedarikçi</CardTitle>
                </div>
                <Link href="/suppliers/dogus">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Detay
                  </Button>
                </Link>
              </div>
              <CardDescription>
                {dogusCount} ürün için fiyat bilgisi mevcut
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Toplam Ürün:</span>
                  <span className="font-medium text-purple-600">{dogusCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                  <Badge variant="default" className="bg-purple-100 text-purple-800">Aktif</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
              />
            </div>
          </CardContent>
        </Card>

        {/* Comprehensive Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary-600" />
              Tüm Tedarikçi Fiyatları Karşılaştırması
            </CardTitle>
            <CardDescription>
              Toplam {filteredProducts.length} ürün listeleniyor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
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
                      <TableHead className="text-blue-600">Başbuğ Fiyat</TableHead>
                      <TableHead className="text-blue-600">Başbuğ Stok</TableHead>
                      <TableHead className="text-green-600">Doğuş Fiyat</TableHead>
                      <TableHead className="text-green-600">Doğuş Stok</TableHead>
                      <TableHead className="text-purple-600">Dinamik Fiyat</TableHead>
                      <TableHead className="text-purple-600">Dinamik Stok</TableHead>
                      <TableHead>WooCommerce Tarihi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
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
                            {formatPrice(product.basbuğ_price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.basbuğ_stock && product.basbuğ_stock > 0 ? 'default' : 'destructive'}
                            className="bg-blue-100 text-blue-800"
                          >
                            {product.basbuğ_stock || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatPrice(product.dogus_price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.dogus_stock && product.dogus_stock > 0 ? 'default' : 'destructive'}
                            className="bg-green-100 text-green-800"
                          >
                            {product.dogus_stock || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-purple-600">
                            {formatPrice(product.dinamik_price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={product.dinamik_stock && product.dinamik_stock > 0 ? 'default' : 'destructive'}
                            className="bg-purple-100 text-purple-800"
                          >
                            {product.dinamik_stock || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(product.woo_last_update)}
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