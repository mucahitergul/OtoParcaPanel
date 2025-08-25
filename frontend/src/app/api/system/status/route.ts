import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? 
      `${process.env.NEXT_PUBLIC_API_URL}/system/status` : 
      'http://otoparca.isletmemdijitalde.com/api/system/status';
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
    console.error('Error fetching system status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch system status', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}