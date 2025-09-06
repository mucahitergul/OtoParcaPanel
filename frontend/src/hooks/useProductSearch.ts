import { useState, useEffect, useCallback } from 'react';

interface Product {
  id: number;
  stok_kodu: string;
  urun_adi: string;
  fiyat: number;
  stok_miktari: number;
}

interface SearchResult {
  products: Product[];
  loading: boolean;
  error: string | null;
}

export const useProductSearch = (query: string, debounceMs: number = 300) => {
  const [result, setResult] = useState<SearchResult>({
    products: [],
    loading: false,
    error: null,
  });

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResult({ products: [], loading: false, error: null });
      return;
    }

    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(
        `/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`
      );
      
      if (!response.ok) {
        throw new Error('Arama başarısız');
      }

      const data = await response.json();
      const products = data.data || [];

      setResult({
        products: products.slice(0, 10), // Limit to 10 results
        loading: false,
        error: null,
      });
    } catch (error) {
      setResult({
        products: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Bir hata oluştu',
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, debounceMs, searchProducts]);

  return result;
};