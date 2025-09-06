import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchSize = 50 } = body;
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Kimlik doğrulama gerekli' },
        { status: 401 }
      );
    }
    
    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Forward request to backend
    const response = await fetch(`${backendUrl}/products/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ batchSize }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: result.message || 'Senkronizasyon başarısız',
          error: result.error 
        },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: result.message || 'Ürünler başarıyla senkronize edildi',
      data: {
        syncedCount: result.data?.totalProducts || 0,
        newProducts: result.data?.newProducts || 0,
        updatedProducts: result.data?.updatedProducts || 0,
        errors: result.data?.errors || []
      }
    });
    
  } catch (error) {
    console.error('WooCommerce sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Senkronizasyon sırasında hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      },
      { status: 500 }
    );
  }
}