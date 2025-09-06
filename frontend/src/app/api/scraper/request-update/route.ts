import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL ? 
      `${process.env.NEXT_PUBLIC_API_URL}/scraper/request-update` : 
      'http://localhost:3001/api/scraper/request-update';
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error forwarding scraper request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to forward scraper request', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}