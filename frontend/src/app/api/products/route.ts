import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const stockStatus = searchParams.get('stockStatus') || '';
    const hasStock = searchParams.get('hasStock') || '';
    const priceMin = searchParams.get('priceMin') || '';
    const priceMax = searchParams.get('priceMax') || '';
    const supplier = searchParams.get('supplier') || '';
    const needsSync = searchParams.get('needsSync') || '';

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.append('page', page);
    queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    if (category) queryParams.append('category', category);
    if (stockStatus) queryParams.append('stockStatus', stockStatus);
    if (hasStock) queryParams.append('hasStock', hasStock);
    if (priceMin) queryParams.append('priceMin', priceMin);
    if (priceMax) queryParams.append('priceMax', priceMax);
    if (supplier) queryParams.append('supplier', supplier);
    if (needsSync) queryParams.append('needsSync', needsSync);

    // Forward request to backend
    const backendUrl = `http://localhost:3001/api/products?${queryParams.toString()}`;
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch products', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}