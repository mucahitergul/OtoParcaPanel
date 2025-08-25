import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? 
      `${process.env.NEXT_PUBLIC_API_URL}/products/statistics` : 
      'http://otoparca.isletmemdijitalde.com/api/products/statistics';
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
    console.error('Error fetching product statistics:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch product statistics', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}