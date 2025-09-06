'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, Pause, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface SyncProgress {
  syncId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  totalProducts: number;
  processedProducts: number;
  successfulProducts: number;
  failedProducts: number;
  skippedProducts: number;
  currentProduct?: string;
  startTime: string;
  endTime?: string;
  errors: string[];
  estimatedTimeRemaining?: number;
}

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncId: string | null;
}

export default function SyncProgressModal({ isOpen, onClose, syncId }: SyncProgressModalProps) {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !syncId) {
      setProgress(null);
      setError(null);
      return;
    }

    const fetchProgress = async () => {
      try {
        const token = sessionStorage.getItem('auth_token') || document.cookie
          .split('; ')
          .find(row => row.startsWith('auth_token='))
          ?.split('=')[1];

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Use the WooCommerce sync progress endpoint
        let endpoint = `/api/woocommerce/sync-progress/${syncId}`;
        
        console.log('Fetching progress from endpoint:', endpoint);
        const response = await fetch(endpoint, {
          headers,
        });
        
        if (!response.ok) {
          console.error(`Failed to fetch progress: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          throw new Error(`Failed to fetch progress: ${response.statusText}`);
        }
        
        console.log('Progress response:', response);

        const result = await response.json();
        console.log('Progress result:', result);
        if (result.success && result.data) {
          setProgress(result.data);
        } else {
          setError('Progress bilgisi alınamadı');
        }
      } catch (err) {
        setError('Progress bilgisi alınırken hata oluştu');
        console.error('Progress fetch error:', err);
      }
    };

    // Initial fetch
    fetchProgress();

    // Set up polling for progress updates
    const interval = setInterval(fetchProgress, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, syncId]);

  const handleCancel = async () => {
    if (!syncId || !progress || (progress.status !== 'running' && progress.status !== 'paused')) return;

    try {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token') || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/woocommerce/cancel-sync/${syncId}`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        setProgress(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }
    } catch (err) {
      console.error('Cancel sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    // If sync is running or paused, cancel it first
    if (progress && (progress.status === 'running' || progress.status === 'paused')) {
      await handleCancel();
    }
    onClose();
  };

  const handlePause = async () => {
    if (!syncId || !progress || progress.status !== 'running') return;

    try {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token') || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/woocommerce/pause-sync/${syncId}`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        setProgress(prev => prev ? { ...prev, status: 'paused' } : null);
      }
    } catch (err) {
      console.error('Pause sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    if (!syncId || !progress || progress.status !== 'paused') return;

    try {
      setLoading(true);
      const token = sessionStorage.getItem('auth_token') || document.cookie
        .split('; ')
        .find(row => row.startsWith('auth_token='))
        ?.split('=')[1];

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/woocommerce/resume-sync/${syncId}`, {
        method: 'POST',
        headers,
      });

      const result = await response.json();
      if (result.success) {
        setProgress(prev => prev ? { ...prev, status: 'running' } : null);
      }
    } catch (err) {
      console.error('Resume sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}s ${minutes % 60}d ${seconds % 60}sn`;
    } else if (minutes > 0) {
      return `${minutes}d ${seconds % 60}sn`;
    } else {
      return `${seconds}sn`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-orange-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Çalışıyor';
      case 'paused':
        return 'Duraklatıldı';
      case 'completed':
        return 'Tamamlandı';
      case 'failed':
        return 'Başarısız';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-none" style={{margin: 0}}>
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Ürün Senkronizasyonu</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : !progress ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Senkronizasyon başlatılıyor...</p>
            </div>
          ) : (
            <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(progress.status)}
                  <span className="text-lg font-medium">{getStatusText(progress.status)}</span>
                </div>
                <Badge className={getStatusColor(progress.status)}>
                  {progress.status.toUpperCase()}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>İlerleme</span>
                  <span>
                    {progress.processedProducts} / {progress.totalProducts} ürün
                  </span>
                </div>
                <Progress 
                  value={progress.totalProducts > 0 ? (progress.processedProducts / progress.totalProducts) * 100 : 0} 
                  className="h-3 [&>div]:bg-blue-500"
                />
                <div className="text-center text-sm text-gray-500">
                  {progress.totalProducts > 0 
                    ? `%${Math.round((progress.processedProducts / progress.totalProducts) * 100)}`
                    : '0%'
                  }
                </div>
              </div>

              {/* Current Product */}
              {progress.currentProduct && (progress.status === 'running' || progress.status === 'paused') && (
                <div className={`p-3 rounded-lg ${
                  progress.status === 'paused' ? 'bg-orange-50' : 'bg-blue-50'
                }`}>
                  <p className={`text-sm ${
                    progress.status === 'paused' ? 'text-orange-800' : 'text-blue-800'
                  }`}>
                    <strong>
                      {progress.status === 'paused' ? 'Son işlenen:' : 'Şu an işleniyor:'}
                    </strong> {progress.currentProduct}
                  </p>
                </div>
              )}

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-green-600">{progress.successfulProducts}</div>
                  <div className="text-xs text-green-800">Eklenen</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-yellow-600">{progress.skippedProducts}</div>
                  <div className="text-xs text-yellow-800">Atlanan</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <div className="text-xl font-bold text-red-600">{progress.failedProducts}</div>
                  <div className="text-xs text-red-800">Başarısız</div>
                </div>
              </div>

              {/* Time Information */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Başlangıç:</span>
                  <span>{new Date(progress.startTime).toLocaleString('tr-TR')}</span>
                </div>
                {progress.endTime && (
                  <div className="flex justify-between">
                    <span>Bitiş:</span>
                    <span>{new Date(progress.endTime).toLocaleString('tr-TR')}</span>
                  </div>
                )}
                {progress.estimatedTimeRemaining && progress.status === 'running' && (
                  <div className="flex justify-between">
                    <span>Tahmini Kalan Süre:</span>
                    <span>{formatTime(progress.estimatedTimeRemaining)}</span>
                  </div>
                )}
              </div>

              {/* Errors */}
              {progress.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">Hatalar ({progress.errors.length}):</h4>
                  <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                    {progress.errors.slice(-5).map((error, index) => (
                      <p key={index} className="text-sm text-red-800 mb-1">
                        • {error}
                      </p>
                    ))}
                    {progress.errors.length > 5 && (
                      <p className="text-xs text-red-600 mt-2">
                        ... ve {progress.errors.length - 5} hata daha
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4">
                <div className="flex space-x-3">
                  {progress.status === 'running' && (
                    <Button
                      variant="outline"
                      onClick={handlePause}
                      disabled={loading}
                      className="flex items-center space-x-2 border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                      <span>Durdur</span>
                    </Button>
                  )}
                  {progress.status === 'paused' && (
                    <Button
                      variant="outline"
                      onClick={handleResume}
                      disabled={loading}
                      className="flex items-center space-x-2 border-green-300 text-green-700 hover:bg-green-50"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>Devam Et</span>
                    </Button>
                  )}
                </div>
                <div className="flex space-x-3">
                  {(progress.status === 'running' || progress.status === 'paused') && (
                    <Button
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={loading}
                      className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-6"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      <span>İptal Et</span>
                    </Button>
                  )}
                  {(progress.status !== 'running' && progress.status !== 'paused') && (
                    <Button onClick={handleClose} variant="outline">
                      Kapat
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}