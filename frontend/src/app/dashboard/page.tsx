'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Package, 
  TrendingUp, 
  AlertCircle, 
  RefreshCw, 
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ShoppingCart,
  History,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface DashboardStats {
  totalProducts: number;
  inStockProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  syncRequired: number;
}

interface SystemStatus {
  woocommerce: {
    connected: boolean;
    lastSync: string;
    status: 'online' | 'offline' | 'error';
  };
  pythonScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
  };
}

interface QuickAction {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const productsResponse = await fetch('/api/products/statistics');

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        
        setStats({
          totalProducts: productsData.data.totalProducts || 0,
          inStockProducts: productsData.data.inStockProducts || 0,
          outOfStockProducts: productsData.data.outOfStockProducts || 0,
          lowStockProducts: productsData.data.lowStockProducts || 0,
          syncRequired: productsData.data.needsSyncProducts || 0,
        });
      } else {
        // Mock data for demo
        setStats({
          totalProducts: 5,
          inStockProducts: 4,
          outOfStockProducts: 1,
          lowStockProducts: 1,
          syncRequired: 2,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Mock data for demo
      setStats({
        totalProducts: 5,
        inStockProducts: 4,
        outOfStockProducts: 1,
        lowStockProducts: 1,
        syncRequired: 2,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      setStatusLoading(true);
      const systemStatusResponse = await fetch('/api/system/status');

      if (systemStatusResponse.ok) {
        const statusData = await systemStatusResponse.json();
        setSystemStatus(statusData.data);
      } else {
        // Mock system status
        setSystemStatus({
          woocommerce: {
            connected: false,
            lastSync: 'Henüz bağlanmadı',
            status: 'offline'
          },
          pythonScraper: {
            connected: false,
            lastUpdate: 'Henüz bağlanmadı',
            status: 'offline'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
      setSystemStatus({
        woocommerce: {
          connected: false,
          lastSync: 'Bağlantı hatası',
          status: 'error'
        },
        pythonScraper: {
          connected: false,
          lastUpdate: 'Bağlantı hatası',
          status: 'error'
        }
      });
    } finally {
      setStatusLoading(false);
    }
  };

  const handleQuickSync = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/suppliers/update-prices', {
        method: 'POST',
      });
      
      if (response.ok) {
        await fetchDashboardData();
        toast.success('Tedarikçi fiyatları başarıyla güncellendi!');
      } else {
        toast.error('Fiyat güncelleme başarısız!');
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Fiyat güncelleme sırasında hata oluştu!');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // İlk yükleme
    fetchDashboardData();
    fetchSystemStatus();

    // 10 saniyede bir sistem durumunu kontrol et
    const statusInterval = setInterval(() => {
      fetchSystemStatus();
    }, 10000); // 10 saniye

    // Cleanup function
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const quickActions: QuickAction[] = [
    {
      title: 'Ürün Yönetimi',
      description: 'Ürünleri görüntüle, düzenle ve yönet',
      href: '/products',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      title: 'Tedarikçi Fiyatları',
      description: 'Fiyatları karşılaştır ve en iyisini seç',
      href: '/suppliers',
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Fiyat Geçmişi',
      description: 'Fiyat değişikliklerini takip et',
      href: '/price-history',
      icon: History,
      color: 'bg-purple-500'
    },
    {
      title: 'Sistem Ayarları',
      description: 'Kar marjları ve entegrasyonları yönet',
      href: '/settings',
      icon: Settings,
      color: 'bg-gray-500'
    }
  ];

  const StatCard = ({ title, value, icon: Icon, change, changeType, color }: {
    title: string;
    value: string | number;
    icon: any;
    change?: string;
    changeType?: 'increase' | 'decrease';
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {loading ? (
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            ) : (
              value
            )}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {change}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Hoş geldiniz, {user?.firstName || 'Kullanıcı'}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Oto yedek parça stok ve fiyat yönetim sisteminize hoş geldiniz.
            </p>
            <div className="flex items-center mt-4 text-blue-200">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date().toLocaleDateString('tr-TR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div className="hidden lg:block">
            <button
              onClick={handleQuickSync}
              disabled={syncing}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}
            </button>
          </div>
        </div>
      </div>

      {/* Ürün İstatistikleri */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Ürün"
          value={stats?.totalProducts || 0}
          icon={Package}
          color="bg-blue-500"
        />
        <StatCard
          title="Stokta Var"
          value={stats?.inStockProducts || 0}
          icon={TrendingUp}
          color="bg-green-500"
          change={`${stats ? Math.round((stats.inStockProducts / stats.totalProducts) * 100) : 0}%`}
          changeType="increase"
        />
        <StatCard
          title="Stokta Yok"
          value={stats?.outOfStockProducts || 0}
          icon={AlertCircle}
          color="bg-red-500"
          change={`${stats ? Math.round((stats.outOfStockProducts / stats.totalProducts) * 100) : 0}%`}
          changeType="decrease"
        />
        <StatCard
          title="Senkronizasyon Gerekli"
          value={stats?.syncRequired || 0}
          icon={RefreshCw}
          color="bg-orange-500"
        />
      </div>

       {/* Quick Actions */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
         <h2 className="text-xl font-semibold text-gray-900 mb-6">Hızlı İşlemler</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {quickActions.map((action, index) => (
             <Link
               key={index}
               href={action.href}
               className="group p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
             >
               <div className="flex items-center gap-3 mb-3">
                 <div className={`p-2 rounded-lg ${action.color}`}>
                   <action.icon className="h-5 w-5 text-white" />
                 </div>
                 <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                   {action.title}
                 </h3>
               </div>
               <p className="text-sm text-gray-600">{action.description}</p>
             </Link>
           ))}
         </div>
       </div>

       {/* Sistem Durumu */}
       <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Sistem Durumu</h2>
           <button
             onClick={fetchSystemStatus}
             disabled={statusLoading}
             className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2 text-sm"
           >
             <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
             Yenile
           </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* WooCommerce Durumu */}
           <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-medium text-gray-900 dark:text-white">WooCommerce</h3>
               <div className={`w-3 h-3 rounded-full ${
                 systemStatus?.woocommerce.status === 'online' ? 'bg-green-500' :
                 systemStatus?.woocommerce.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
               }`}></div>
             </div>
             <div className="text-sm text-gray-600 dark:text-gray-400">
               <div className="mb-1">
                 Durum: <span className={`font-medium ${
                   systemStatus?.woocommerce.status === 'online' ? 'text-green-600 dark:text-green-400' :
                   systemStatus?.woocommerce.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                 }`}>
                   {systemStatus?.woocommerce.connected ? 'Bağlı' : 'Bağlı Değil'}
                 </span>
               </div>
               <div>Son Senkronizasyon: {systemStatus?.woocommerce.lastSync || 'Bilinmiyor'}</div>
             </div>
           </div>

           {/* Python Scraper Durumu */}
           <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-600">
             <div className="flex items-center justify-between mb-3">
               <h3 className="font-medium text-gray-900 dark:text-white">Python Scraper API</h3>
               <div className={`w-3 h-3 rounded-full ${
                 systemStatus?.pythonScraper.status === 'online' ? 'bg-green-500' :
                 systemStatus?.pythonScraper.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
               }`}></div>
             </div>
             <div className="text-sm text-gray-600 dark:text-gray-400">
               <div className="mb-1">
                 Durum: <span className={`font-medium ${
                   systemStatus?.pythonScraper.status === 'online' ? 'text-green-600 dark:text-green-400' :
                   systemStatus?.pythonScraper.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                 }`}>
                   {systemStatus?.pythonScraper.connected ? 'Bağlı' : 'Bağlı Değil'}
                 </span>
               </div>
               <div>Son Güncelleme: {systemStatus?.pythonScraper.lastUpdate || 'Bilinmiyor'}</div>
             </div>
           </div>
         </div>

         {/* Özet İstatistikler */}
         <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
               <div className="text-xl font-bold text-green-600 dark:text-green-400 mb-1">
                 {stats ? Math.round((stats.inStockProducts / stats.totalProducts) * 100) : 0}%
               </div>
               <div className="text-sm text-green-700 dark:text-green-300">Stok Oranı</div>
             </div>
             
             <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
               <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                 {stats?.totalProducts || 0}
               </div>
               <div className="text-sm text-blue-700 dark:text-blue-300">Toplam Ürün</div>
             </div>
             
             <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
               <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                 {stats?.syncRequired || 0}
               </div>
               <div className="text-sm text-orange-700 dark:text-orange-300">Senkron Gerekli</div>
             </div>
           </div>
         </div>
       </div>
     </div>
   );
}