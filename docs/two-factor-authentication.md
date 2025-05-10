# Two-Factor Authentication Implementation

## Overview

This document provides a comprehensive overview of the Two-Factor Authentication (2FA) implementation in the Data Modeler Cloud application. The implementation uses Time-based One-Time Password (TOTP) authentication to enhance security.

## Architecture

The 2FA implementation follows these key principles:

1. **Optional Enablement**: Users can choose to enable 2FA for their accounts
2. **TOTP Standard**: Uses industry-standard TOTP algorithm (RFC 6238)
3. **QR Code Setup**: Provides easy setup via QR code scanning
4. **Fallback Storage**: Uses both Supabase user metadata and local storage for resilience

## Components

### 1. Authentication Context (`/context/auth-context.tsx`)

The authentication context was extended to support 2FA functionality:

#### State Variables
- `isTwoFactorEnabled`: Boolean indicating if 2FA is enabled for the current user
- `isTwoFactorVerified`: Boolean indicating if the user has verified their 2FA during the current session

#### Methods
- `setupTwoFactor()`: Generates a TOTP secret and QR code for setup
  - Returns: `{ secret: string, qrCode: string }`
  
- `verifyTwoFactor(token: string, setupSecret?: string)`: Verifies a 2FA token and enables 2FA
  - Parameters:
    - `token`: The 6-digit code from the authenticator app
    - `setupSecret`: (Optional) The secret from the setup process
  - Returns: `Promise<boolean>` indicating success or failure
  
- `disableTwoFactor()`: Disables 2FA for the user
  - Returns: `Promise<boolean>` indicating success or failure
  
- `validateTwoFactorToken(token: string)`: Validates a 2FA token during login
  - Parameters:
    - `token`: The 6-digit code from the authenticator app
  - Returns: `Promise<boolean>` indicating if the token is valid

#### Storage Strategy
The implementation uses a hybrid storage approach:
- Primary storage: Supabase user metadata (`user.user_metadata.totp_secret` and `user.user_metadata.two_factor_enabled`)
- Fallback storage: Local storage (`dm_totp_secret` and `dm_two_factor_enabled`)

This approach ensures resilience against Supabase session issues.

### 2. Two-Factor Setup Component (`/components/auth/two-factor-setup.tsx`)

This component guides users through the 2FA setup process:

#### Features
- QR code generation for scanning with authenticator apps
- Manual setup option with a text secret
- Verification step to ensure correct setup
- Recovery codes display after successful setup

#### Props
```typescript
interface TwoFactorSetupProps {
  onComplete?: () => void;
}
```

#### Usage
```tsx
<TwoFactorSetup onComplete={() => console.log('Setup complete')} />
```

### 3. Two-Factor Verification Component (`/components/auth/two-factor-verify.tsx`)

This component handles verification of 2FA codes during login:

#### Features
- Input field for 6-digit TOTP code
- Validation against stored secret
- Success and error state handling

#### Props
```typescript
interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}
```

#### Usage
```tsx
<TwoFactorVerify 
  onSuccess={() => console.log('Verification successful')} 
  onCancel={() => console.log('Verification cancelled')} 
/>
```

### 4. Settings Page (`/app/protected/settings/page.tsx`)

The settings page allows users to manage their 2FA settings:

#### Features
- Security tab with 2FA options
- Current 2FA status display
- Enable/disable 2FA buttons
- Integration with the 2FA setup component

### 5. Sign-In Form (`/components/auth/sign-in-form.tsx`)

The sign-in form was modified to support 2FA:

#### Flow
1. User enters email and password
2. If credentials are valid and 2FA is enabled, show the 2FA verification component
3. If 2FA is not enabled or verification is successful, redirect to the protected area

## Dependencies

- **otpauth**: Library for generating TOTP secrets and validating tokens
- **qrcode.react**: Library for generating QR codes
- **Supabase Auth**: Used for user authentication and metadata storage

## Known Issues and Workarounds

### Supabase Session Issues

**Issue**: The application sometimes encounters "Auth session missing!" errors when trying to update user metadata.

**Workaround**: The implementation uses local storage as a fallback mechanism when Supabase session issues occur. This ensures that the 2FA status persists even when there are issues with the Supabase session.

## Security Considerations

1. **Secret Storage**: TOTP secrets are stored in user metadata and local storage. In a production environment, consider additional encryption.

2. **Recovery Codes**: The current implementation generates placeholder recovery codes. In a production environment, implement secure generation and storage of recovery codes.

3. **Session Verification**: Always verify 2FA status on sensitive operations, not just during login.

## Future Improvements

1. **Recovery Flow**: Implement a complete recovery flow using recovery codes.

2. **Remember Device**: Add an option to remember trusted devices.

3. **Audit Logging**: Add logging for 2FA-related events (setup, verification, disabling).

4. **Admin Controls**: Add admin controls to require 2FA for certain user roles.

## Testing

To test the 2FA implementation:

1. Enable 2FA in the settings page
2. Scan the QR code with an authenticator app
3. Verify the setup with a code from the app
4. Sign out and sign back in
5. Verify that the 2FA verification step appears during login
