import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? 
      `${process.env.NEXT_PUBLIC_API_URL}/auth/auto-login` : 
      'http://localhost:3001/api/auth/auto-login';
    
    const response = await fetch(backendUrl, {
      method: 'POST',
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
    console.error('Error with auto login:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Auto login failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}