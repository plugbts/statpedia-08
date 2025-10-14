import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { z } from 'zod';

// Validation schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = refreshSchema.parse(body);
    
    // Get client IP and user agent for audit logging
    const ip_address = request.ip || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';
    
    // Attempt token refresh
    const result = await authService.refreshToken(validatedData, {
      ip_address,
      user_agent
    });
    
    return NextResponse.json({
      success: true,
      data: {
        token: result.token,
        expiresIn: 900 // 15 minutes in seconds
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
