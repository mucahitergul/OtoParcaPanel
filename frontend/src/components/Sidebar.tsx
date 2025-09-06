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

  TrendingUp,
} from 'lucide-react';

const navigation = [
  { name: 'Anasayfa', href: '/dashboard', icon: Home },
  { name: 'Ürünler', href: '/products', icon: Package },
  { name: 'Tedarikçi Fiyatları', href: '/suppliers', icon: DollarSign },
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-sidebar-bg transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-bold text-black dark:text-sidebar-text-active">
            Oto Parça Panel
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md text-gray-400 dark:text-sidebar-text hover:text-gray-500 dark:hover:text-sidebar-text-active hover:bg-gray-100 dark:hover:bg-sidebar-item-hover"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <SidebarContent pathname={pathname} onLogout={handleLogout} user={user} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-sidebar-bg sidebar-border shadow-lg">
          <div className="flex items-center h-20 px-6">
            <h1 className="text-xl font-bold text-black dark:text-sidebar-text-active">
              Oto Parça Panel
            </h1>
          </div>
          <SidebarContent pathname={pathname} onLogout={handleLogout} user={user} />
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between h-16 px-4 bg-white dark:bg-sidebar-bg border-b border-gray-200 dark:border-sidebar-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md text-gray-400 dark:text-sidebar-text hover:text-gray-500 dark:hover:text-sidebar-text-active hover:bg-gray-100 dark:hover:bg-sidebar-item-hover"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-black dark:text-sidebar-text-active">
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
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-4 py-3 text-sm font-semibold rounded-xl ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-black dark:text-sidebar-text'
              }`}
            >
              <item.icon
                className={`mr-4 h-5 w-5 flex-shrink-0 ${
                  isActive
                    ? 'text-white'
                    : 'text-black dark:text-sidebar-text'
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="flex-shrink-0 p-6 border-t border-gray-200 dark:border-sidebar-border">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-bold text-black dark:text-sidebar-text-active">
              {user?.firstName || 'Kullanıcı'}
            </p>
            <p className="text-xs font-medium text-black dark:text-sidebar-text truncate">
              {user?.email}
            </p>
          </div>
          <button
            onClick={onLogout}
            className="ml-3 p-2 rounded-xl text-black dark:text-sidebar-text"
            title="Çıkış Yap"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}