import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
// Note: In a production environment with multiple instances, 
// you would use Redis or another distributed store
interface RateLimitStore {
  [ip: string]: {
    [endpoint: string]: {
      count: number;
      resetTime: number;
    };
  };
}

const store: RateLimitStore = {};

// Rate limit configuration by endpoint type
export const rateLimits = {
  // Authentication endpoints - more restrictive
  auth: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },
  // Admin endpoints - more restrictive
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
  },
  // Default for all other API endpoints
  default: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

/**
 * Check if a request should be rate limited
 * @param request The Next.js request object
 * @returns An object with the rate limit status
 */
export function checkRateLimit(request: NextRequest): {
  limited: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  // Get the IP address from the request
  // Next.js doesn't expose IP directly, so we get it from headers
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  // Get the endpoint path
  const path = request.nextUrl.pathname;
  
  // Determine which rate limit to apply based on the endpoint
  let rateLimit = rateLimits.default;
  if (path.startsWith('/api/auth')) {
    rateLimit = rateLimits.auth;
  } else if (path.startsWith('/api/admin')) {
    rateLimit = rateLimits.admin;
  }
  
  // Initialize store for this IP if it doesn't exist
  if (!store[ip]) {
    store[ip] = {};
  }
  
  // Initialize store for this endpoint if it doesn't exist
  if (!store[ip][path]) {
    store[ip][path] = {
      count: 0,
      resetTime: Date.now() + rateLimit.windowMs,
    };
  }
  
  // Check if the window has expired and reset if needed
  const now = Date.now();
  if (now > store[ip][path].resetTime) {
    store[ip][path] = {
      count: 0,
      resetTime: now + rateLimit.windowMs,
    };
  }
  
  // Increment the request count
  store[ip][path].count++;
  
  // Calculate remaining requests
  const remaining = Math.max(0, rateLimit.maxRequests - store[ip][path].count);
  
  // Check if the rate limit has been exceeded
  const limited = store[ip][path].count > rateLimit.maxRequests;
  
  return {
    limited,
    limit: rateLimit.maxRequests,
    remaining,
    reset: store[ip][path].resetTime,
  };
}

/**
 * Apply rate limiting to a response
 * @param response The Next.js response object
 * @param rateLimitInfo Rate limit information
 * @returns The modified response with rate limit headers
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimitInfo: {
    limit: number;
    remaining: number;
    reset: number;
  }
): NextResponse {
  // Add rate limit headers to the response
  response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
  response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitInfo.reset.toString());
  
  return response;
}

/**
 * Create a rate limit exceeded response
 * @param rateLimitInfo Rate limit information
 * @returns A 429 Too Many Requests response
 */
export function createRateLimitExceededResponse(
  rateLimitInfo: {
    limit: number;
    remaining: number;
    reset: number;
  }
): NextResponse {
  const response = NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
    { status: 429 }
  );
  
  return applyRateLimitHeaders(response, rateLimitInfo);
}
