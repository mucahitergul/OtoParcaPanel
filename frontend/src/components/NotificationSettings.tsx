'use client';

import { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Settings, 
  Save, 
  Test, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Package, 
  DollarSign,
  RefreshCw,
  Users,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  type: 'stock' | 'price' | 'sync' | 'system';
  enabled: boolean;
  conditions: {
    threshold?: number;
    operator?: 'less_than' | 'greater_than' | 'equals';
    frequency?: 'immediate' | 'daily' | 'weekly';
  };
  recipients: string[];
}

interface NotificationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultRules: NotificationRule[] = [
  {
    id: '1',
    name: 'Düşük Stok Uyarısı',
    description: 'Ürün stok miktarı belirlenen seviyenin altına düştüğünde bildirim gönder',
    type: 'stock',
    enabled: true,
    conditions: {
      threshold: 10,
      operator: 'less_than',
      frequency: 'immediate'
    },
    recipients: ['admin@example.com']
  },
  {
    id: '2',
    name: 'Stok Tükendi',
    description: 'Ürün stokta kalmadığında bildirim gönder',
    type: 'stock',
    enabled: true,
    conditions: {
      threshold: 0,
      operator: 'equals',
      frequency: 'immediate'
    },
    recipients: ['admin@example.com']
  },
  {
    id: '3',
    name: 'Fiyat Değişikliği',
    description: 'Ürün fiyatında değişiklik olduğunda bildirim gönder',
    type: 'price',
    enabled: false,
    conditions: {
      frequency: 'daily'
    },
    recipients: ['admin@example.com']
  },
  {
    id: '4',
    name: 'Senkronizasyon Hatası',
    description: 'WooCommerce senkronizasyonunda hata oluştuğunda bildirim gönder',
    type: 'sync',
    enabled: true,
    conditions: {
      frequency: 'immediate'
    },
    recipients: ['admin@example.com', 'tech@example.com']
  },
  {
    id: '5',
    name: 'Günlük Rapor',
    description: 'Günlük stok ve satış raporunu e-posta ile gönder',
    type: 'system',
    enabled: false,
    conditions: {
      frequency: 'daily'
    },
    recipients: ['admin@example.com']
  },
  {
    id: '6',
    name: 'Haftalık Özet',
    description: 'Haftalık performans özetini e-posta ile gönder',
    type: 'system',
    enabled: false,
    conditions: {
      frequency: 'weekly'
    },
    recipients: ['admin@example.com']
  }
];

export default function NotificationSettings({ isOpen, onClose }: NotificationSettingsProps) {
  const [rules, setRules] = useState<NotificationRule[]>(defaultRules);
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'Oto Parça Panel'
  });
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'stock':
        return <Package className="h-4 w-4" />;
      case 'price':
        return <DollarSign className="h-4 w-4" />;
      case 'sync':
        return <RefreshCw className="h-4 w-4" />;
      case 'system':
        return <Settings className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'price':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'sync':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'system':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleRuleToggle = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };

  const handleRuleUpdate = (ruleId: string, updates: Partial<NotificationRule>) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  };

  const handleAddRecipient = (ruleId: string) => {
    if (!newRecipient.trim()) return;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newRecipient)) {
      toast.error('Geçerli bir e-posta adresi girin');
      return;
    }

    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, recipients: [...rule.recipients, newRecipient] }
        : rule
    ));
    setNewRecipient('');
  };

  const handleRemoveRecipient = (ruleId: string, email: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, recipients: rule.recipients.filter(r => r !== email) }
        : rule
    ));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Bildirim ayarları kaydedildi');
    } catch (error) {
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Test e-postası gönderildi');
    } catch (error) {
      toast.error('Test e-postası gönderilemedi');
    } finally {
      setTestingEmail(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Bildirim Ayarları
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                E-posta bildirimleri ve uyarı kurallarını yönetin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Email Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-posta Konfigürasyonu
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Sunucu
                </label>
                <input
                  type="text"
                  value={emailSettings.smtpHost}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpHost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={emailSettings.smtpPort}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPort: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kullanıcı Adı
                </label>
                <input
                  type="email"
                  value={emailSettings.smtpUser}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpUser: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Şifre
                </label>
                <input
                  type="password"
                  value={emailSettings.smtpPassword}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, smtpPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gönderen E-posta
                </label>
                <input
                  type="email"
                  value={emailSettings.fromEmail}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gönderen Adı
                </label>
                <input
                  type="text"
                  value={emailSettings.fromName}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Test className="h-4 w-4" />
              )}
              {testingEmail ? 'Gönderiliyor...' : 'Test E-postası Gönder'}
            </button>
          </div>

          {/* Notification Rules */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Bildirim Kuralları
            </h3>
            
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getTypeColor(rule.type)}`}>
                        {getTypeIcon(rule.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{rule.description}</p>
                      </div>
                    </div>
                    
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => handleRuleToggle(rule.id)}
                        className="sr-only"
                      />
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${
                        rule.enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                          rule.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </label>
                  </div>
                  
                  {rule.enabled && (
                    <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      {/* Conditions */}
                      {(rule.type === 'stock' && rule.conditions.threshold !== undefined) && (
                        <div className="flex items-center gap-3">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Eşik Değer:</label>
                          <input
                            type="number"
                            value={rule.conditions.threshold}
                            onChange={(e) => handleRuleUpdate(rule.id, {
                              conditions: { ...rule.conditions, threshold: Number(e.target.value) }
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                          <select
                            value={rule.conditions.operator}
                            onChange={(e) => handleRuleUpdate(rule.id, {
                              conditions: { ...rule.conditions, operator: e.target.value as any }
                            })}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="less_than">Küçük</option>
                            <option value="greater_than">Büyük</option>
                            <option value="equals">Eşit</option>
                          </select>
                        </div>
                      )}
                      
                      {/* Frequency */}
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Sıklık:</label>
                        <select
                          value={rule.conditions.frequency}
                          onChange={(e) => handleRuleUpdate(rule.id, {
                            conditions: { ...rule.conditions, frequency: e.target.value as any }
                          })}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        >
                          <option value="immediate">Anında</option>
                          <option value="daily">Günlük</option>
                          <option value="weekly">Haftalık</option>
                        </select>
                      </div>
                      
                      {/* Recipients */}
                      <div>
                        <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Alıcılar:</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {rule.recipients.map((email, index) => (
                            <span key={index} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm">
                              {email}
                              <button
                                onClick={() => handleRemoveRecipient(rule.id, email)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={newRecipient}
                            onChange={(e) => setNewRecipient(e.target.value)}
                            placeholder="E-posta adresi ekle"
                            className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient(rule.id)}
                          />
                          <button
                            onClick={() => handleAddRecipient(rule.id)}
                            className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 transition-colors"
                          >
                            Ekle
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Kaydet
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}