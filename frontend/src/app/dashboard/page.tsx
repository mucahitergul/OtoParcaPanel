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
  dinamikScraper: {
    connected: boolean;
    lastUpdate: string;
    status: 'online' | 'offline' | 'error';
    browser_ready?: boolean;
    logged_in?: boolean;
    captcha_waiting?: boolean;
    captcha_resolved?: boolean;
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
          },
          dogusScraper: {
            connected: false,
            lastUpdate: 'Henüz bağlanmadı',
            status: 'offline'
          },
          basbugScraper: {
            connected: false,
            lastUpdate: 'Henüz bağlanmadı',
            status: 'offline'
          },
          dinamikScraper: {
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
        },
        dogusScraper: {
          connected: false,
          lastUpdate: 'Bağlantı hatası',
          status: 'error'
        },
        basbugScraper: {
          connected: false,
          lastUpdate: 'Bağlantı hatası',
          status: 'error'
        },
        dinamikScraper: {
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
    },
    {
      title: 'WooCommerce Ayarları',
      description: 'WooCommerce entegrasyonunu yapılandır',
      href: '/settings?tab=woocommerce',
      icon: ShoppingCart,
      color: 'bg-orange-500'
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
    <div className="bg-white dark:bg-surface-1 rounded-[5px] p-4 border border-solid">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-muted mb-1">{title}</p>
          {loading ? (
            <div className="h-6 w-16 bg-gray-200 dark:bg-surface-2 rounded animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-foreground">{value}</p>
          )}
          {change && (
            <div className={`flex items-center text-xs font-medium mt-1 ${
              changeType === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {change}
            </div>
          )}
        </div>
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-[10px] ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header ve İstatistikler Kartı */}
        <div className="bg-white dark:bg-surface-1 rounded-[5px] p-6 mb-8 border border-solid border-[#ebebeb] dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Kontrol Paneli
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Oto yedek parça stok ve fiyat yönetim sistemi
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleQuickSync}
                disabled={syncing}
                className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
              >
                <RefreshCw className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Güncelleniyor...' : 'Fiyatları Güncelle'}
              </button>
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

          {/* Sistem Durumu */}
          <div className="mt-8">
           
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* WooCommerce Durumu */}
              <div className="p-4 rounded-[15px] bg-white dark:bg-surface-2 border border-solid border-[#ebebeb] dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-foreground">WooCommerce</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus?.woocommerce.status === 'online' ? 'bg-green-500' :
                    systemStatus?.woocommerce.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-muted">Durum:</span>
                    <span className={`text-xs font-bold ${
                      systemStatus?.woocommerce.status === 'online' ? 'text-green-600 dark:text-green-400' :
                      systemStatus?.woocommerce.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-muted'
                    }`}>
                      {systemStatus?.woocommerce.connected ? 'Bağlı' : 'Bağlı Değil'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Doğuş Api Durumu */}
              <div className="p-4 rounded-[15px] bg-white dark:bg-surface-2 border border-solid border-[#ebebeb] dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-foreground">Doğuş Api</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus?.dogusScraper.status === 'online' ? 'bg-green-500' :
                    systemStatus?.dogusScraper.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-gray-600 dark:text-muted">Durum:</span>
                     <span className={`text-xs font-bold ${
                       systemStatus?.dogusScraper.status === 'online' ? 'text-green-600 dark:text-green-400' :
                       systemStatus?.dogusScraper.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-muted'
                     }`}>
                       {systemStatus?.dogusScraper.status === 'online' ? 'Hazır' : 
                        systemStatus?.dogusScraper.connected ? 'Bağlı ama Hazır Değil' : 'Bağlı Değil'}
                     </span>
                   </div>
                   {systemStatus?.dogusScraper.connected && systemStatus?.dogusScraper.status !== 'online' && (
                     <div className="text-xs text-orange-600 dark:text-orange-400">
                       {!systemStatus?.dogusScraper.browser_ready && 'Tarayıcı başlatılmamış'}
                       {systemStatus?.dogusScraper.browser_ready && !systemStatus?.dogusScraper.logged_in && 'Giriş yapılmamış'}
                       {systemStatus?.dogusScraper.captcha_waiting && 'CAPTCHA bekleniyor'}
                     </div>
                   )}
                 </div>
              </div>

              {/* Basbuğ Api Durumu */}
              <div className="p-4 rounded-[15px] bg-white dark:bg-surface-2 border border-solid border-[#ebebeb] dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-foreground">Basbuğ Api</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus?.basbugScraper.status === 'online' ? 'bg-green-500' :
                    systemStatus?.basbugScraper.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-gray-600 dark:text-muted">Durum:</span>
                     <span className={`text-xs font-bold ${
                       systemStatus?.basbugScraper.status === 'online' ? 'text-green-600 dark:text-green-400' :
                       systemStatus?.basbugScraper.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-muted'
                     }`}>
                       {systemStatus?.basbugScraper.status === 'online' ? 'Hazır' : 
                        systemStatus?.basbugScraper.connected ? 'Bağlı ama Hazır Değil' : 'Bağlı Değil'}
                     </span>
                   </div>
                   {systemStatus?.basbugScraper.connected && systemStatus?.basbugScraper.status !== 'online' && (
                     <div className="text-xs text-orange-600 dark:text-orange-400">
                       {!systemStatus?.basbugScraper.browser_ready && 'Tarayıcı başlatılmamış'}
                       {systemStatus?.basbugScraper.browser_ready && !systemStatus?.basbugScraper.logged_in && 'Giriş yapılmamış'}
                       {systemStatus?.basbugScraper.captcha_waiting && 'CAPTCHA bekleniyor'}
                     </div>
                   )}
                 </div>
              </div>

              {/* Dinamik Api Durumu */}
              <div className="p-4 rounded-[15px] bg-white dark:bg-surface-2 border border-solid border-[#ebebeb] dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-foreground">Dinamik Api</h3>
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus?.dinamikScraper.status === 'online' ? 'bg-green-500' :
                    systemStatus?.dinamikScraper.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="space-y-2">
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-medium text-gray-600 dark:text-muted">Durum:</span>
                     <span className={`text-xs font-bold ${
                       systemStatus?.dinamikScraper.status === 'online' ? 'text-green-600 dark:text-green-400' :
                       systemStatus?.dinamikScraper.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-muted'
                     }`}>
                       {systemStatus?.dinamikScraper.status === 'online' ? 'Hazır' : 
                        systemStatus?.dinamikScraper.connected ? 'Bağlı ama Hazır Değil' : 'Bağlı Değil'}
                     </span>
                   </div>
                   {systemStatus?.dinamikScraper.connected && systemStatus?.dinamikScraper.status !== 'online' && (
                     <div className="text-xs text-orange-600 dark:text-orange-400">
                       {!systemStatus?.dinamikScraper.browser_ready && 'Tarayıcı başlatılmamış'}
                       {systemStatus?.dinamikScraper.browser_ready && !systemStatus?.dinamikScraper.logged_in && 'Giriş yapılmamış'}
                       {systemStatus?.dinamikScraper.captcha_waiting && 'CAPTCHA bekleniyor'}
                     </div>
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-surface-1 rounded-[5px] p-6 mb-8 border border-solid border-[#ebebeb] dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-foreground mb-6">Hızlı İşlemler</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className="group p-4 rounded-[15px] bg-white dark:bg-surface-2 border border-solid border-[#ebebeb] dark:border-gray-700"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-[10px] ${action.color} mb-4`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-foreground mb-2 text-sm">
                  {action.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-muted">{action.description}</p>
              </Link>
            ))}
          </div>
        </div>


     </div>
   </div>
 );
}