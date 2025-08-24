'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings as SettingsIcon,
  DollarSign,
  ShoppingCart,
  Database,
  Save,
  RefreshCw,
  TestTube,
  AlertCircle,
  CheckCircle,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  default_profit_margin: number;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  woocommerce_url: string;
  woocommerce_consumer_key: string;
  woocommerce_consumer_secret: string;
  python_scraper_api_url: string;
  min_stock_threshold: number;
  max_price_change_percentage: number;
}

interface ProfitMargins {
  dinamik_margin: number;
  basbug_margin: number;
  dogus_margin: number;
}

export default function SettingsPage() {
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    default_profit_margin: 20,
    auto_sync_enabled: true,
    sync_interval_minutes: 60,
    woocommerce_url: '',
    woocommerce_consumer_key: '',
    woocommerce_consumer_secret: '',
    python_scraper_api_url: 'http://localhost:8000',
    min_stock_threshold: 5,
    max_price_change_percentage: 50,
  });

  const [profitMargins, setProfitMargins] = useState<ProfitMargins>({
    dinamik_margin: 20,
    basbug_margin: 25,
    dogus_margin: 22,
  });

  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [settingsResponse, marginsResponse] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/profit-margins/current')
      ]);

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        const settingsMap = settingsData.data.reduce((acc: any, setting: any) => {
          acc[setting.key] = setting.parsed_value;
          return acc;
        }, {});
        setSystemSettings(prev => ({ ...prev, ...settingsMap }));
      }

      if (marginsResponse.ok) {
        const marginsData = await marginsResponse.json();
        setProfitMargins(marginsData.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ayarlar yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const promises = [];

      // Save system settings
      for (const [key, value] of Object.entries(systemSettings)) {
        promises.push(
          fetch(`/api/settings/${key}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
          })
        );
      }

      await Promise.all(promises);
      toast.success('Sistem ayarları kaydedildi');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfitMargins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/profit-margins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profitMargins),
      });

      if (response.ok) {
        toast.success('Kar marjı ayarları kaydedildi');
      } else {
        toast.error('Kar marjı ayarları kaydedilemedi');
      }
    } catch (error) {
      console.error('Error saving profit margins:', error);
      toast.error('Kar marjı ayarları kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const testWooCommerceConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionStatus('idle');
      
      const response = await fetch('/api/settings/woocommerce/test-connection', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.success ? 'success' : 'error');
        toast.success(data.success ? 'WooCommerce bağlantısı başarılı' : 'WooCommerce bağlantısı başarısız');
      } else {
        setConnectionStatus('error');
        toast.error('WooCommerce bağlantısı test edilemedi');
      }
    } catch (error) {
      console.error('Error testing WooCommerce connection:', error);
      setConnectionStatus('error');
      toast.error('Bağlantı testi sırasında hata oluştu');
    } finally {
      setTestingConnection(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/reset-defaults', {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Ayarlar varsayılan değerlere sıfırlandı');
        fetchSettings();
      } else {
        toast.error('Ayarlar sıfırlanamadı');
      }
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Ayarlar sıfırlanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Sistem Ayarları</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sistem ayarlarını, kar marjlarını ve entegrasyonları yönetin
            </p>
          </div>
          <button
            onClick={resetToDefaults}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Varsayılana Sıfırla
          </button>
        </div>

        <div className="space-y-6">
          {/* Tabs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-1">
            <div className="grid w-full grid-cols-3 gap-1">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'general'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <SettingsIcon className="h-4 w-4" />
                Genel Ayarlar
              </button>
              <button
                onClick={() => setActiveTab('profit-margins')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'profit-margins'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <DollarSign className="h-4 w-4" />
                Kar Marjları
              </button>
              <button
                onClick={() => setActiveTab('woocommerce')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'woocommerce'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                WooCommerce
              </button>
            </div>
          </div>

          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <SettingsIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Genel Sistem Ayarları</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Varsayılan Kar Marjı (%)</label>
                    <input
                      type="number"
                      value={systemSettings.default_profit_margin}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, default_profit_margin: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senkronizasyon Aralığı (dakika)</label>
                    <input
                      type="number"
                      value={systemSettings.sync_interval_minutes}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, sync_interval_minutes: Number(e.target.value) }))}
                      min="1"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Stok Eşiği</label>
                    <input
                      type="number"
                      value={systemSettings.min_stock_threshold}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, min_stock_threshold: Number(e.target.value) }))}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maksimum Fiyat Değişim Yüzdesi (%)</label>
                    <input
                      type="number"
                      value={systemSettings.max_price_change_percentage}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, max_price_change_percentage: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Python Scraper API URL</label>
                    <input
                      type="text"
                      value={systemSettings.python_scraper_api_url}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, python_scraper_api_url: e.target.value }))}
                      placeholder="http://localhost:8000"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="autoSync"
                      checked={systemSettings.auto_sync_enabled}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, auto_sync_enabled: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="autoSync" className="text-sm font-medium text-gray-700 dark:text-gray-300">Otomatik Senkronizasyon</label>
                  </div>
                </div>
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Genel Ayarları Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profit Margins */}
          {activeTab === 'profit-margins' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Percent className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tedarikçi Kar Marjları</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dinamik Kar Marjı (%)</label>
                    <input
                      type="number"
                      value={profitMargins.dinamik_margin}
                      onChange={(e) => setProfitMargins(prev => ({ ...prev, dinamik_margin: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Başbuğ Kar Marjı (%)</label>
                    <input
                      type="number"
                      value={profitMargins.basbug_margin}
                      onChange={(e) => setProfitMargins(prev => ({ ...prev, basbug_margin: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Doğuş Kar Marjı (%)</label>
                    <input
                      type="number"
                      value={profitMargins.dogus_margin}
                      onChange={(e) => setProfitMargins(prev => ({ ...prev, dogus_margin: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveProfitMargins}
                    disabled={loading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Kar Marjlarını Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* WooCommerce Settings */}
          {activeTab === 'woocommerce' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShoppingCart className="h-5 w-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">WooCommerce Entegrasyonu</h2>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WooCommerce Site URL</label>
                    <input
                      type="text"
                      value={systemSettings.woocommerce_url}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, woocommerce_url: e.target.value }))}
                      placeholder="https://yourstore.com"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Key</label>
                    <input
                      type="text"
                      value={systemSettings.woocommerce_consumer_key}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, woocommerce_consumer_key: e.target.value }))}
                      placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consumer Secret</label>
                    <input
                      type="password"
                      value={systemSettings.woocommerce_consumer_secret}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, woocommerce_consumer_secret: e.target.value }))}
                      placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={testWooCommerceConnection}
                    disabled={testingConnection}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <TestTube className={`h-4 w-4 ${testingConnection ? 'animate-spin' : ''}`} />
                    Bağlantıyı Test Et
                  </button>
                  
                  {connectionStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Bağlantı başarılı</span>
                    </div>
                  )}
                  
                  {connectionStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Bağlantı başarısız</span>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleSaveSettings}
                    disabled={loading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    WooCommerce Ayarlarını Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}