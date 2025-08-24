'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Link from 'next/link';
import { Package, Shield, TrendingUp, Users } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">
                Oto Yedek Parça Panel
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Giriş Yap
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Kayıt Ol
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Oto Yedek Parça
            <span className="text-blue-600"> Stok Takip</span>
            <br />Sistemi
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            WooCommerce entegrasyonu ile otomatik ürün çekimi, çoklu toptancı stok sorgulama 
            ve akıllı güncelleme sistemi. İşletmenizi dijital çağa taşıyın.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Hemen Başla
            </Link>
            <Link
              href="/login"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Giriş Yap
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              WooCommerce Entegrasyonu
            </h3>
            <p className="text-gray-600">
              E-ticaret sitenizden otomatik ürün çekimi ve senkronizasyon
            </p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Çoklu Toptancı
            </h3>
            <p className="text-gray-600">
              Dinamik, Başbuğ ve Doğuş toptancılarından gerçek zamanlı stok sorgulama
            </p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Akıllı Güncelleme
            </h3>
            <p className="text-gray-600">
              Otomatik stok ve fiyat güncelleme sistemi ile güncel kalın
            </p>
          </div>

          <div className="text-center">
            <div className="bg-yellow-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Güvenli Sistem
            </h3>
            <p className="text-gray-600">
              JWT tabanlı güvenlik ve şifreli veri saklama
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Hemen Başlayın
          </h2>
          <p className="text-xl mb-6 opacity-90">
            Ücretsiz hesap oluşturun ve sistemi keşfedin
          </p>
          <Link
            href="/register"
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 rounded-lg text-lg font-medium transition-colors inline-block"
          >
            Ücretsiz Kayıt Ol
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Oto Yedek Parça Panel. Tüm hakları saklıdır.
          </p>
        </div>
      </footer>
    </div>
  );
}
