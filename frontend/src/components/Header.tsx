'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProductSearch } from '../hooks/useProductSearch';
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Loader2,
  Home,
  Package,
  DollarSign,
  Cog,
  Zap,
} from 'lucide-react';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { products, loading, error } = useProductSearch(searchQuery);

  // Navigation items
  const navigation = [
    {
      name: 'Anasayfa',
      href: '/',
      icon: Home,
      current: pathname === '/'
    },
    {
      name: 'Ürünler',
      href: '/products',
      icon: Package,
      current: pathname.startsWith('/products')
    },
    {
      name: 'Tedarikçi Fiyatları',
      href: '/suppliers',
      icon: DollarSign,
      current: pathname.startsWith('/suppliers')
    },
    {
      name: 'Scraper Test',
      href: '/test-scraper',
      icon: Zap,
      current: pathname.startsWith('/test-scraper')
    },
    {
      name: 'Sistem Ayarları',
      href: '/settings',
      icon: Cog,
      current: pathname.startsWith('/settings')
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowSearchResults(value.length > 0);
  };

  const handleProductClick = (productId: number) => {
    setSearchQuery('');
    setShowSearchResults(false);
    router.push(`/products/${productId}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchResults(false);
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-900 header-border shadow-sm">
      <div className="px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo and Site Name */}
          <div className="flex items-center mr-8">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">OP</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  OtoParca Panel
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">
                  Yönetim Sistemi
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    item.current
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  <span className="hidden lg:block">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Search */}
          <div className="flex-1 max-w-md mx-8" ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {loading ? (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                ) : (
                  <Search className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <input
                type="text"
                placeholder="Ürün ara..."
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery.length > 0 && setShowSearchResults(true)}
                className="block w-full pl-12 pr-4 py-3 border-0 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-gray-700 text-sm font-medium transition-all duration-200"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (searchQuery.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
                  {loading && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Aranıyor...
                    </div>
                  )}
                  
                  {error && (
                    <div className="p-4 text-center text-red-500">
                      {error}
                    </div>
                  )}
                  
                  {!loading && !error && products.length === 0 && searchQuery.length > 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      Ürün bulunamadı
                    </div>
                  )}
                  
                  {!loading && !error && products.length > 0 && (
                    <>
                      {products.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-600 last:border-b-0 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {product.urun_adi}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Stok Kodu: {product.stok_kodu}
                              </p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                                ₺{typeof product.fiyat === 'number' ? product.fiyat.toFixed(2) : parseFloat(product.fiyat || '0').toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Stok: {product.stok_miktari}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                      
                      {products.length === 10 && (
                        <div className="p-3 text-center border-t border-gray-100 dark:border-gray-600">
                          <button
                            onClick={() => {
                              setShowSearchResults(false);
                              router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
                            }}
                            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                          >
                            Tüm sonuçları görüntüle
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-3">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105"
              title={isDarkMode ? 'Açık tema' : 'Koyu tema'}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Notifications */}
            <button className="p-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full shadow-sm"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 p-2 text-sm rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105"
              >
                <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-white">
                    {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
                    {user?.firstName || 'Kullanıcı'}
                  </p>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.firstName || 'Kullanıcı'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>
                  
                  <a
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profil
                  </a>
                  
                  <a
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Ayarlar
                  </a>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}