'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Search, TrendingUp, TrendingDown, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface PriceHistory {
  id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  change_reason: string;
  change_source: 'manual' | 'supplier_update' | 'auto_calculation';
  changed_at: string;
  user?: {
    username: string;
  };
  product: {
    stok_kodu: string;
    urun_adi: string;
  };
  price_change: number;
  price_change_percentage: number;
}

export default function PriceHistoryPage() {
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    fetchPriceHistory();
  }, [dateRange]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.append('from', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('to', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/price-history?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setPriceHistory(data.data || []);
      } else {
        toast.error('Fiyat geçmişi yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = priceHistory.filter(history => {
    const matchesSearch = history.product.stok_kodu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         history.product.urun_adi.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = selectedSource === 'all' || history.change_source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (change < 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const getChangeBadge = (change: number) => {
    if (change > 0) {
      return <Badge variant="destructive">Artış</Badge>;
    } else if (change < 0) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Azalış</Badge>;
    }
    return <Badge variant="secondary">Değişiklik Yok</Badge>;
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'manual':
        return <Badge variant="outline">Manuel</Badge>;
      case 'supplier_update':
        return <Badge className="bg-blue-100 text-blue-800">Tedarikçi</Badge>;
      case 'auto_calculation':
        return <Badge className="bg-purple-100 text-purple-800">Otomatik</Badge>;
      default:
        return <Badge variant="secondary">{source}</Badge>;
    }
  };

  const totalChanges = filteredHistory.length;
  const priceIncreases = filteredHistory.filter(h => h.price_change > 0).length;
  const priceDecreases = filteredHistory.filter(h => h.price_change < 0).length;
  const averageChange = filteredHistory.length > 0 
    ? filteredHistory.reduce((sum, h) => sum + h.price_change_percentage, 0) / filteredHistory.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fiyat Geçmişi</h1>
          <p className="text-muted-foreground">
            Ürün fiyat değişikliklerini takip edin ve analiz edin
          </p>
        </div>
        <Button onClick={fetchPriceHistory} disabled={loading}>
          <Calendar className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Değişiklik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalChanges}</div>
            <p className="text-xs text-muted-foreground">
              Son {dateRange?.from && dateRange?.to 
                ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
                : 30} gün
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiyat Artışları</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{priceIncreases}</div>
            <p className="text-xs text-muted-foreground">
              %{totalChanges > 0 ? ((priceIncreases / totalChanges) * 100).toFixed(1) : 0} oranında
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fiyat Azalışları</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{priceDecreases}</div>
            <p className="text-xs text-muted-foreground">
              %{totalChanges > 0 ? ((priceDecreases / totalChanges) * 100).toFixed(1) : 0} oranında
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Değişim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              averageChange > 0 ? 'text-red-600' : averageChange < 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              %{averageChange.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Fiyat değişim ortalaması
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Stok kodu veya ürün adı ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Değişiklik kaynağı" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Kaynaklar</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="supplier_update">Tedarikçi Güncellemesi</SelectItem>
                <SelectItem value="auto_calculation">Otomatik Hesaplama</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-72"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fiyat Değişiklik Geçmişi</CardTitle>
          <CardDescription>
            Ürün fiyatlarında yapılan tüm değişiklikler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Stok Kodu</TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Eski Fiyat</TableHead>
                <TableHead>Yeni Fiyat</TableHead>
                <TableHead>Değişim</TableHead>
                <TableHead>Değişim %</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Sebep</TableHead>
                <TableHead>Kullanıcı</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((history) => (
                <TableRow key={history.id}>
                  <TableCell>
                    {format(new Date(history.changed_at), 'dd.MM.yyyy HH:mm', { locale: tr })}
                  </TableCell>
                  <TableCell className="font-medium">{history.product.stok_kodu}</TableCell>
                  <TableCell>{history.product.urun_adi}</TableCell>
                  <TableCell>₺{history.old_price.toFixed(2)}</TableCell>
                  <TableCell>₺{history.new_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChangeIcon(history.price_change)}
                      <span className={history.price_change > 0 ? 'text-red-600' : history.price_change < 0 ? 'text-green-600' : 'text-gray-600'}>
                        ₺{Math.abs(history.price_change).toFixed(2)}
                      </span>
                      {getChangeBadge(history.price_change)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={history.price_change_percentage > 0 ? 'text-red-600' : history.price_change_percentage < 0 ? 'text-green-600' : 'text-gray-600'}>
                      %{history.price_change_percentage.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getSourceBadge(history.change_source)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {history.change_reason}
                    </span>
                  </TableCell>
                  <TableCell>
                    {history.user?.username || 'Sistem'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredHistory.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Seçilen kriterlere uygun fiyat değişikliği bulunamadı.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}