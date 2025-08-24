'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  PieChart, 
  Activity, 
  Target, 
  Zap, 
  Users,
  ShoppingCart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface DashboardData {
  overview: {
    totalProducts: number;
    totalValue: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    recentSyncs: number;
    avgPrice: number;
    activeCategories: number;
    lastSyncTime: string;
  };
  trends: {
    productGrowth: number;
    valueGrowth: number;
    stockGrowth: number;
    syncGrowth: number;
    categoryGrowth: number;
  };
  recentActivity: Array<{
    id: string;
    type: 'sync' | 'update' | 'add' | 'delete';
    message: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
  topCategories: Array<{
    name: string;
    count: number;
    value: number;
    growth: number;
  }>;
  stockAlerts: Array<{
    id: string;
    productName: string;
    stockCode: string;
    currentStock: number;
    minStock: number;
    severity: 'critical' | 'warning' | 'info';
  }>;
  performanceMetrics: {
    syncSuccessRate: number;
    avgSyncTime: number;
    errorRate: number;
    uptime: number;
  };
  quickStats: {
    todayAdded: number;
    todayUpdated: number;
    todaySynced: number;
    todayErrors: number;
  };
}

interface AdvancedDashboardProps {
  className?: string;
}

export default function AdvancedDashboard({ className = '' }: AdvancedDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      // Simulated API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: DashboardData = {
        overview: {
          totalProducts: 1247,
          totalValue: 156780.50,
          lowStockProducts: 23,
          outOfStockProducts: 8,
          recentSyncs: 156,
          avgPrice: 125.75,
          activeCategories: 12,
          lastSyncTime: new Date().toISOString()
        },
        trends: {
          productGrowth: 12.5,
          valueGrowth: 8.3,
          stockGrowth: -2.1,
          syncGrowth: 15.7,
          categoryGrowth: 5.2
        },
        recentActivity: [
          {
            id: '1',
            type: 'sync',
            message: '156 ürün başarıyla senkronize edildi',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            status: 'success'
          },
          {
            id: '2',
            type: 'update',
            message: 'Motor Yağı fiyatı güncellendi',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            status: 'success'
          },
          {
            id: '3',
            type: 'add',
            message: '5 yeni ürün eklendi',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            status: 'success'
          },
          {
            id: '4',
            type: 'sync',
            message: 'Senkronizasyon hatası: 3 ürün',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            status: 'error'
          },
          {
            id: '5',
            type: 'update',
            message: 'Fren Balata stok miktarı güncellendi',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            status: 'warning'
          }
        ],
        topCategories: [
          { name: 'Motor Parçaları', count: 456, value: 67890.25, growth: 15.3 },
          { name: 'Fren Sistemi', count: 234, value: 34567.80, growth: 8.7 },
          { name: 'Elektrik', count: 189, value: 28945.15, growth: -2.1 },
          { name: 'Kaporta', count: 156, value: 15678.90, growth: 12.4 },
          { name: 'Süspansiyon', count: 98, value: 9876.45, growth: 5.8 }
        ],
        stockAlerts: [
          {
            id: '1',
            productName: 'Motor Yağı 5W-30',
            stockCode: 'MY-5W30-001',
            currentStock: 2,
            minStock: 10,
            severity: 'critical'
          },
          {
            id: '2',
            productName: 'Fren Balata Ön',
            stockCode: 'FB-ON-002',
            currentStock: 5,
            minStock: 15,
            severity: 'warning'
          },
          {
            id: '3',
            productName: 'Hava Filtresi',
            stockCode: 'HF-STD-003',
            currentStock: 8,
            minStock: 20,
            severity: 'warning'
          }
        ],
        performanceMetrics: {
          syncSuccessRate: 94.5,
          avgSyncTime: 2.3,
          errorRate: 5.5,
          uptime: 99.8
        },
        quickStats: {
          todayAdded: 12,
          todayUpdated: 45,
          todaySynced: 156,
          todayErrors: 3
        }
      };
      
      setDashboardData(mockData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Auto refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Az önce';
    if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} saat önce`;
    return `${Math.floor(diffInMinutes / 1440)} gün önce`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'sync':
        return <RefreshCw className="h-4 w-4" />;
      case 'update':
        return <Activity className="h-4 w-4" />;
      case 'add':
        return <Package className="h-4 w-4" />;
      case 'delete':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'warning':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'error':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'warning':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'info':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color, subtitle }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 hover:shadow-medium transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${getTrendColor(trend)}`}>
            {getTrendIcon(trend)}
            <span className="ml-1">{formatPercentage(trend)}</span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-gray-600 dark:text-gray-400">Dashboard yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className={`flex items-center justify-center min-h-96 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Dashboard verileri yüklenemedi</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Gelişmiş Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Son güncelleme: {formatTimeAgo(dashboardData.overview.lastSyncTime)}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData.quickStats.todayAdded}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Bugün Eklenen</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData.quickStats.todayUpdated}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Bugün Güncellenen</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData.quickStats.todaySynced}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Bugün Senkronize</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {dashboardData.quickStats.todayErrors}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Bugün Hata</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Toplam Ürün"
          value={dashboardData.overview.totalProducts.toLocaleString('tr-TR')}
          icon={Package}
          trend={dashboardData.trends.productGrowth}
          color="bg-blue-500"
        />
        <StatCard
          title="Toplam Değer"
          value={formatCurrency(dashboardData.overview.totalValue)}
          icon={DollarSign}
          trend={dashboardData.trends.valueGrowth}
          color="bg-green-500"
        />
        <StatCard
          title="Aktif Kategori"
          value={dashboardData.overview.activeCategories}
          icon={BarChart3}
          trend={dashboardData.trends.categoryGrowth}
          color="bg-purple-500"
        />
        <StatCard
          title="Başarı Oranı"
          value={`${dashboardData.performanceMetrics.syncSuccessRate}%`}
          icon={Target}
          color="bg-orange-500"
          subtitle="Senkronizasyon"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Son Aktiviteler
          </h3>
          <div className="space-y-3">
            {dashboardData.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getActivityColor(activity.status)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Stok Uyarıları
          </h3>
          <div className="space-y-3">
            {dashboardData.stockAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {alert.productName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {alert.stockCode} • Stok: {alert.currentStock}/{alert.minStock}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                  {alert.severity === 'critical' ? 'Kritik' : 
                   alert.severity === 'warning' ? 'Uyarı' : 'Bilgi'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Categories */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          En Çok Ürün Kategorileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {dashboardData.topCategories.map((category, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {category.count}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {category.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {formatCurrency(category.value)}
              </div>
              <div className={`text-xs mt-1 ${getTrendColor(category.growth)}`}>
                {formatPercentage(category.growth)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl w-fit mx-auto mb-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dashboardData.performanceMetrics.syncSuccessRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Başarı Oranı</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl w-fit mx-auto mb-3">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dashboardData.performanceMetrics.avgSyncTime}s
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Ortalama Süre</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl w-fit mx-auto mb-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dashboardData.performanceMetrics.errorRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Hata Oranı</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl w-fit mx-auto mb-3">
            <Zap className="h-6 w-6 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {dashboardData.performanceMetrics.uptime}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Çalışma Süresi</div>
        </div>
      </div>
    </div>
  );
}