# Security Grid Authentication System

## Overview

The Security Grid Authentication system provides an additional layer of protection for the Data Modeler Cloud application by requiring users to enter a predefined access code before they can reach authentication pages. This helps prevent automated attacks and adds an extra security barrier before exposing the main authentication system.

## Key Features

- **Randomized Numeric Grid**: A shuffled 3x3 grid of digits (0-9) that changes on each page load
- **Rate Limiting**: Protection against brute force attacks with cooldown periods
- **Session Timeout**: Security validation expires after 5 minutes
- **Server-Side Validation**: Access code is validated securely on the server
- **Protected Routes**: Intercepts navigation to sign-in and sign-up pages

## Technical Implementation

### Components

1. **Security Check Page** (`/app/security-check/page.tsx`)
   - Client-side React component that displays the security grid
   - Handles user input, validation attempts, and error states
   - Manages rate limiting UI feedback

2. **Security Check API** (`/app/api/security-check/route.ts`)
   - Server-side validation of the access code
   - Sets a secure HTTP-only cookie upon successful validation
   - Implements rate limiting to prevent brute force attacks

3. **Middleware Integration** (`/middleware.ts`)
   - Intercepts navigation to protected routes
   - Checks for the presence of a valid security cookie
   - Redirects to the security check page when needed

### Authentication Flow

1. User attempts to access a protected route (`/sign-in`, `/sign-up`, or clicks "Get Started")
2. Middleware checks if the user has a valid `security_check_passed` cookie
3. If no valid cookie exists, the user is redirected to `/security-check` with the original destination as a query parameter
4. User enters the access code using the randomized grid
5. On successful validation, a secure cookie is set and the user is redirected to their original destination
6. The security cookie expires after 5 minutes, requiring re-validation for new sessions

## Security Considerations

### Access Code Storage

- The access code is stored in the `.env.local` file as `ACCESS_CODE=yoursecurecode`
- This file is included in `.gitignore` to prevent accidental exposure in version control
- The code is never exposed to client-side JavaScript

### Cookie Security

- The security validation cookie is:
  - HTTP-only (inaccessible to JavaScript)
  - Secure (only sent over HTTPS in production)
  - SameSite=strict (prevents CSRF attacks)
  - Short-lived (expires after 5 minutes)

### Rate Limiting

- Users have 5 attempts to enter the correct code
- After 5 failed attempts, a 30-second cooldown is enforced
- Server-side rate limiting further restricts excessive API calls

## Maintenance and Updates

### Changing the Access Code

To change the access code:

1. Edit the `.env.local` file and update the `ACCESS_CODE` value
2. Restart the application for the changes to take effect

### Customizing the Grid

The grid layout can be modified in `/app/security-check/page.tsx`:

- Change the grid dimensions by modifying the CSS grid classes
- Adjust the number of digits by changing the array length in the `useEffect` hook

### Adjusting Timeout Duration

To change the security session duration:

1. Modify the `maxAge` value in the cookie settings in `/app/api/security-check/route.ts`
2. The value is in seconds (300 = 5 minutes)

## Troubleshooting

### Common Issues

- **"Server configuration error"**: Ensure the `ACCESS_CODE` is properly set in `.env.local`
- **Excessive redirects**: Check that the middleware conditions are correctly evaluating protected routes
- **Rate limiting errors**: Verify that the rate limiting configuration is appropriate for your use case

### Debugging

For debugging purposes, you can:

1. Check the browser's developer tools to inspect cookies and redirects
2. Review server logs for authentication and rate limiting events
3. Temporarily disable the security check in development by commenting out the relevant middleware section

## Future Enhancements

Potential improvements to consider:

- Add support for multiple valid access codes
- Implement IP-based tracking for more sophisticated rate limiting
- Create an admin interface to manage and rotate access codes
- Add analytics to track security check usage and failure patterns
