'use client';

import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

const publicRoutes = ['/login', '/register', '/forgot-password'];

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, loading, isAuthenticated, isInitialized } = useAuth();
  const pathname = usePathname();
  
  const isPublicRoute = publicRoutes.includes(pathname);

  // Debug log for AppLayout
  console.log('[AppLayout] State:', {
    pathname,
    isPublicRoute,
    user: user ? `${user.email} (ID: ${user.id})` : 'null',
    loading,
    isAuthenticated,
    isInitialized
  });

  // Show loading spinner while checking authentication or initializing
  if (loading || !isInitialized) {
    console.log('[AppLayout] Showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Public routes (login, register, etc.) - full page layout
  if (isPublicRoute) {
    console.log('[AppLayout] Rendering public route');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {children}
      </div>
    );
  }

  // Check authentication more strictly
  const hasValidAuth = user && user.id && isAuthenticated;
  console.log('[AppLayout] Authentication check:', {
    hasUser: !!user,
    hasUserId: !!(user && user.id),
    isAuthenticated,
    hasValidAuth
  });

  // Protected routes - redirect to login if not authenticated
  if (!hasValidAuth) {
    console.log('[AppLayout] Not authenticated, showing login prompt');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8 p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Giriş Gerekli
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Bu sayfayı görüntülemek için giriş yapmanız gerekiyor.
            </p>
            <a
              href="/login"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Giriş Yap
            </a>
          </div>
        </div>
      </div>
    );
  }

  console.log('[AppLayout] Rendering authenticated layout');

  // Authenticated layout with sidebar and header
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      {/* Main content area */}
      <div className="lg:pl-64">
        <Header />
        
        {/* Page content */}
        <main className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="animate-in">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}