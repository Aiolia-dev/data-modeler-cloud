# Security Implementations

This document details the security enhancements implemented in the Data Modeler Cloud application, focusing on Security Headers and API Rate Limiting.

## 1. Security Headers

Security headers are HTTP response headers that instruct browsers how to behave when handling the application's content. They provide an additional layer of security against various attacks including XSS, clickjacking, and code injection.

### Implementation Details

The security headers are implemented in the application's middleware (`middleware.ts`), ensuring they are applied to all responses:

```typescript
// Security header definitions
const securityHeaders = {
  // Content-Security-Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';",
  
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  'X-Content-Type-Options': 'nosniff',
  
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Force HTTPS connections
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Control browser features and APIs
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};
```

### Headers Explanation

1. **Content-Security-Policy (CSP)**
   - Controls which resources can be loaded by the browser
   - Restricts scripts, styles, and images to the application's own domain
   - Allows connections to Supabase services
   - Prevents the application from being framed (additional clickjacking protection)

2. **X-Content-Type-Options**
   - Set to 'nosniff' to prevent MIME type sniffing
   - Prevents browsers from interpreting files as a different MIME type

3. **X-Frame-Options**
   - Set to 'DENY' to prevent the application from being embedded in iframes
   - Provides protection against clickjacking attacks

4. **Strict-Transport-Security (HSTS)**
   - Forces browsers to use HTTPS for the application
   - Set with a long max-age (2 years) and includeSubDomains for comprehensive protection
   - Added 'preload' directive for maximum security

5. **Referrer-Policy**
   - Set to 'strict-origin-when-cross-origin' to control what information is sent in the Referrer header
   - Balances security and functionality

6. **Permissions-Policy**
   - Restricts access to browser features and APIs
   - Currently restricts camera, microphone, geolocation, and FLoC (interest-cohort)

### Security Benefits

- **XSS Protection**: The CSP helps prevent Cross-Site Scripting attacks by controlling which scripts can run
- **Clickjacking Prevention**: X-Frame-Options and CSP frame-ancestors prevent the application from being framed
- **Transport Security**: HSTS ensures that all connections use HTTPS, preventing man-in-the-middle attacks
- **Privacy Enhancement**: Referrer-Policy and Permissions-Policy protect user privacy

## 2. API Rate Limiting

API Rate Limiting protects the application from abuse by limiting the number of requests a client can make within a specific time window. This helps prevent DDoS attacks, brute force attacks, and API abuse.

### Implementation Details

Rate limiting is implemented through a dedicated utility (`utils/rate-limit.ts`) and integrated into the middleware:

```typescript
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
```

### Rate Limiting Strategy

The implementation uses a tiered approach to rate limiting:

1. **Authentication Endpoints** (`/api/auth/*`)
   - Strictest limits: 10 requests per minute
   - Protects against brute force attacks and credential stuffing

2. **Admin Endpoints** (`/api/admin/*`)
   - Moderate limits: 20 requests per minute
   - Protects sensitive administrative functions

3. **Default API Endpoints**
   - Standard limits: 100 requests per minute
   - Provides general protection while allowing normal application usage

### Response Headers

When a client makes an API request, the following headers are included in the response:

- `X-RateLimit-Limit`: The maximum number of requests allowed in the current window
- `X-RateLimit-Remaining`: The number of requests remaining in the current window
- `X-RateLimit-Reset`: The time (in milliseconds since epoch) when the rate limit window resets

### Rate Limit Exceeded Response

When a client exceeds the rate limit, they receive a 429 (Too Many Requests) response with a JSON payload:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later."
}
```

### Security Benefits

- **DDoS Protection**: Prevents attackers from overwhelming the application with requests
- **Brute Force Prevention**: Limits authentication attempts, protecting user accounts
- **Resource Conservation**: Prevents API abuse that could consume server resources
- **Transparent to Normal Users**: Rate limits are set high enough that legitimate users won't be affected

## Implementation Notes

- Both security features are implemented in the middleware layer, ensuring they are applied consistently across the application
- The implementation is transparent to users and requires no changes to client-side code
- The security enhancements follow industry best practices and OWASP recommendations
- For production deployments with multiple instances, the rate limiting store should be replaced with a distributed solution like Redis

## Future Enhancements

Potential future security enhancements include:

1. Refining the Content Security Policy based on application needs
2. Implementing more granular rate limiting based on user roles or specific endpoints
3. Adding monitoring and alerting for rate limit violations
4. Implementing IP-based blocking for repeated abuse
