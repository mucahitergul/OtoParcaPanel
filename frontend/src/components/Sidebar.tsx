'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  DollarSign,
  History,
  TrendingUp,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Ürünler', href: '/products', icon: Package },
  { name: 'Tedarikçi Fiyatları', href: '/suppliers', icon: DollarSign },
  { name: 'Fiyat Geçmişi', href: '/price-history', icon: History },
  { name: 'Sistem Ayarları', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Oto Parça Panel
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <SidebarContent pathname={pathname} onLogout={handleLogout} user={user} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Oto Parça Panel
            </h1>
          </div>
          <SidebarContent pathname={pathname} onLogout={handleLogout} user={user} />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Oto Parça Panel
          </h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>
    </>
  );
}

function SidebarContent({
  pathname,
  onLogout,
  user,
}: {
  pathname: string;
  onLogout: () => void;
  user: any;
}) {
  return (
    <div className="flex flex-col flex-1">
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-r-2 border-primary-600'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <item.icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.firstName || 'Kullanıcı'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="ml-3 p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}