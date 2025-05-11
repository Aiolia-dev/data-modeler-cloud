# Two-Factor Authentication Implementation

## Overview

This document provides a comprehensive overview of the Two-Factor Authentication (2FA) implementation in the Data Modeler Cloud application. The implementation uses Time-based One-Time Password (TOTP) authentication to enhance security by requiring users to provide a time-based code in addition to their password during login.

## Architecture

The 2FA implementation follows these key principles:

1. **Optional Enablement**: Users can choose to enable 2FA for their accounts
2. **TOTP Standard**: Uses industry-standard TOTP algorithm (RFC 6238)
3. **QR Code Setup**: Provides easy setup via QR code scanning
4. **Fallback Storage**: Uses both Supabase user metadata and local storage for resilience
5. **Recovery Codes**: Provides recovery codes for account access if the authenticator app is unavailable
6. **Time Drift Handling**: Implements robust time drift handling to account for device clock differences

## Components

### 1. Authentication Context (`/context/auth-context.tsx`)

The authentication context was extended to support 2FA functionality:

#### State Variables
- `isTwoFactorEnabled`: Boolean indicating if 2FA is enabled for the current user
- `isTwoFactorVerified`: Boolean indicating if the user has verified their 2FA during the current session
- `twoFactorSecret`: String containing the user's TOTP secret (if available)
- `twoFactorRecoveryCodes`: Array of recovery codes for the user (if available)

#### Methods
- `setupTwoFactor()`: Generates a TOTP secret and QR code for setup
  - Implementation details:
    - Generates a secure random Base32 encoded secret using the otpauth library
    - Creates a QR code URL with the application name and user identifier
    - Handles session updates to ensure the setup process is not blocked
  - Returns: `{ secret: string, qrCode: string }`
  
- `verifyTwoFactor(token: string, setupSecret?: string)`: Verifies a 2FA token and enables 2FA
  - Parameters:
    - `token`: The 6-digit code from the authenticator app
    - `setupSecret`: (Optional) The secret from the setup process
  - Implementation details:
    - Validates the token against the provided secret or stored secret
    - On successful validation, updates user metadata to enable 2FA
    - Generates recovery codes for the user
    - Updates local state to reflect 2FA status
  - Returns: `Promise<boolean>` indicating success or failure
  
- `disableTwoFactor()`: Disables 2FA for the user
  - Implementation details:
    - Updates user metadata to disable 2FA
    - Clears stored TOTP secret and recovery codes
    - Updates local state to reflect 2FA status
  - Returns: `Promise<boolean>` indicating success or failure
  
- `validateTwoFactorToken(token: string)`: Validates a 2FA token during login
  - Parameters:
    - `token`: The 6-digit code from the authenticator app
  - Implementation details:
    - Retrieves the stored TOTP secret
    - Validates the token against the secret using the otpauth library
    - Handles time drift by checking multiple time windows
    - Updates session state on successful validation
  - Returns: `Promise<boolean>` indicating if the token is valid

#### Storage Strategy
The implementation uses a hybrid storage approach:
- Primary storage: Supabase user metadata
  - `user.user_metadata.totp_secret`: The Base32 encoded TOTP secret
  - `user.user_metadata.two_factor_enabled`: Boolean indicating if 2FA is enabled
  - `user.user_metadata.recovery_codes`: Array of recovery codes for account recovery
- Fallback storage: Local storage 
  - `dm_totp_secret`: The TOTP secret (encrypted)
  - `dm_two_factor_enabled`: Boolean indicating if 2FA is enabled
  - `dm_recovery_codes`: Array of recovery codes (encrypted)

This approach ensures resilience against Supabase session issues and provides a seamless user experience.

### 2. Two-Factor Setup Component (`/components/auth/two-factor-setup.tsx`)

This component guides users through the 2FA setup process:

#### Features
- QR code generation for scanning with authenticator apps
- Manual setup option with a text secret
- Verification step to ensure correct setup
- Recovery codes display after successful setup
- Copy-to-clipboard functionality for the secret and recovery codes
- Step-by-step wizard interface with clear instructions

#### Component States
- `setup`: Initial state showing the QR code and manual setup options
- `verify`: Verification state where the user enters a code from their authenticator app
- `success`: Success state showing recovery codes and completion information

#### Implementation Details
- Uses the `useAuth` hook to access 2FA setup and verification methods
- Implements a multi-step wizard interface with progress tracking
- Provides clear error messages for failed verification attempts
- Ensures recovery codes are displayed until explicitly acknowledged by the user
- Includes accessibility features for screen readers

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
- Input field for 6-digit TOTP code with auto-formatting
- Validation against stored secret with time drift handling
- Clear success and error state handling
- Attempt tracking with appropriate feedback
- Clean, focused UI without debug elements

#### Implementation Details
- Uses the `useAuth` hook to access 2FA validation methods
- Implements robust error handling for various failure scenarios
- Supports direct validation with a provided secret (for setup flow)
- Handles time drift by validating across multiple time windows
- Provides fallback validation approaches for compatibility
- Auto-focuses the input field for improved UX

#### Props
```typescript
interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
  secret?: string; // Optional secret for direct validation without using auth context
  userId?: string; // Optional user ID to ensure we're validating for the correct user
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
- Current 2FA status display with clear visual indicators
- Enable/disable 2FA buttons with consistent styling
- Integration with the 2FA setup component
- Confirmation dialogs for important actions

#### Implementation Details
- Uses tabs for organizing different settings categories
- Implements the security tab with 2FA management options
- Provides clear status information about the current 2FA state
- Uses consistent button styling with the application's blue theme
- Handles loading and error states appropriately
- Includes confirmation steps for disabling 2FA to prevent accidental deactivation

### 5. Sign-In Form (`/components/auth/sign-in-form.tsx`)

The sign-in form was modified to support 2FA:

#### Flow
1. User enters email and password
2. If credentials are valid and 2FA is enabled, show the 2FA verification component
3. If 2FA is not enabled or verification is successful, redirect to the protected area

#### Implementation Details
- Extends the standard authentication flow to include 2FA verification
- Maintains the user's session in a partially authenticated state during 2FA verification
- Provides a clean transition between password authentication and 2FA verification
- Handles error states appropriately with clear user feedback
- Supports cancellation of the 2FA verification process
- Implements proper session handling to ensure security

## Dependencies

- **otpauth**: Library for generating TOTP secrets and validating tokens
  - Version: 1.0.1
  - Used for: TOTP secret generation, QR code URL creation, and token validation
  - Documentation: [https://github.com/hectorm/otpauth](https://github.com/hectorm/otpauth)

- **qrcode.react**: Library for generating QR codes
  - Version: 3.1.0
  - Used for: Rendering QR codes for authenticator app scanning
  - Documentation: [https://github.com/zpao/qrcode.react](https://github.com/zpao/qrcode.react)

- **Supabase Auth**: Used for user authentication and metadata storage
  - Used for: User authentication, session management, and storing 2FA metadata
  - Documentation: [https://supabase.com/docs/guides/auth](https://supabase.com/docs/guides/auth)

## Known Issues and Workarounds

### Supabase Session Issues

**Issue**: The application sometimes encounters "Auth session missing!" errors when trying to update user metadata.

**Workaround**: The implementation uses local storage as a fallback mechanism when Supabase session issues occur. This ensures that the 2FA status persists even when there are issues with the Supabase session. The auth context includes robust error handling to gracefully recover from session issues.

### Time Drift Issues

**Issue**: Users' devices may have clocks that are not perfectly synchronized with the server, causing validation failures.

**Workaround**: The implementation checks multiple time windows (±2 windows, or ±1 minute) during validation to account for reasonable time drift. This ensures that codes will validate successfully even if the user's device clock is slightly off.

### Secret Format Compatibility

**Issue**: Different authenticator apps may have varying requirements for secret formats.

**Workaround**: The implementation consistently uses Base32 encoding for TOTP secrets, which is widely compatible with authenticator apps. It also includes fallback validation approaches for edge cases.

## Security Considerations

1. **Secret Storage**: TOTP secrets are stored in user metadata and local storage. In a production environment, consider additional encryption for the local storage fallback.

2. **Recovery Codes**: The implementation generates recovery codes that are stored in the user's metadata. These should be treated with the same level of security as passwords.

3. **Session Verification**: The system verifies 2FA status on login and maintains this state in the session. For highly sensitive operations, consider re-verifying 2FA status.

4. **Rate Limiting**: The implementation does not currently include rate limiting for 2FA attempts. In a production environment, consider implementing rate limiting to prevent brute force attacks.

5. **Backup Authenticator**: Encourage users to set up multiple authenticator apps or backup their configuration to prevent lockout scenarios.

6. **Secret Visibility**: The secret is displayed to users during setup for manual entry. Ensure this is only shown in a secure context and consider implementing a "reveal" button rather than showing it by default.

## Future Improvements

1. **Recovery Flow**: Implement a complete recovery flow using recovery codes, including a dedicated UI for recovery code entry and validation.

2. **Remember Device**: Add an option to remember trusted devices to reduce the frequency of 2FA verification for users on trusted devices.

3. **Audit Logging**: Add comprehensive logging for 2FA-related events (setup, verification, disabling) to support security monitoring and compliance requirements.

4. **Admin Controls**: Add admin controls to require 2FA for certain user roles or to enforce 2FA across the organization.

5. **Backup Methods**: Support additional 2FA methods such as email or SMS as backup verification methods.

6. **Enhanced Recovery Options**: Implement administrator-assisted recovery for enterprise deployments.

7. **Expiring Recovery Codes**: Implement expiration for recovery codes to enhance security.

8. **Progressive Enrollment**: Guide users through 2FA setup during onboarding with the option to skip and enable later.

## Testing

### Manual Testing Procedure

To test the 2FA implementation:

1. **Setup Testing**:
   - Navigate to the settings page and select the Security tab
   - Click "Enable Two-Factor Authentication"
   - Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
   - Enter the 6-digit code from the app to verify setup
   - Save the displayed recovery codes
   - Verify that the setup completes successfully and the status updates

2. **Login Testing**:
   - Sign out of the application
   - Sign back in with your email and password
   - Verify that the 2FA verification screen appears
   - Enter the current code from your authenticator app
   - Verify that you are successfully logged in

3. **Disabling Testing**:
   - Navigate back to the settings page
   - Click "Disable Two-Factor Authentication"
   - Confirm the action
   - Verify that 2FA is successfully disabled
   - Sign out and sign back in to confirm that 2FA is no longer required

### Edge Case Testing

1. **Time Drift Testing**:
   - Temporarily change your device's time to be slightly off
   - Attempt to verify a 2FA code
   - Verify that the system still accepts valid codes despite the time difference

2. **Session Handling**:
   - Enable 2FA and log in successfully
   - Test session persistence across page refreshes
   - Test session timeout behavior with 2FA enabled

3. **Recovery Scenarios**:
   - Simulate losing access to the authenticator app
   - Test the recovery code flow (when implemented)

### Automated Testing

Consider implementing automated tests for the following scenarios:

1. TOTP secret generation and validation
2. QR code generation
3. User metadata updates
4. Session handling with 2FA enabled
5. Recovery code generation and validation

## User Journey

### Enabling 2FA

1. **Access Settings**:
   - User navigates to the protected area of the application
   - User clicks on their profile or account settings
   - User selects the "Security" tab

2. **Initiate Setup**:
   - User views their current 2FA status (disabled)
   - User clicks the "Enable Two-Factor Authentication" button
   - System generates a TOTP secret and displays the setup screen

3. **Configure Authenticator App**:
   - User opens their authenticator app (Google Authenticator, Authy, etc.)
   - User scans the QR code or manually enters the displayed secret
   - Authenticator app adds the account and begins generating codes

4. **Verify Setup**:
   - User enters the current 6-digit code from their authenticator app
   - System validates the code against the generated secret
   - If valid, system enables 2FA for the user's account

5. **Save Recovery Codes**:
   - System displays recovery codes to the user
   - User saves these codes in a secure location
   - User confirms they have saved the codes
   - Setup is complete

### Login with 2FA

1. **Standard Authentication**:
   - User navigates to the login page
   - User enters their email and password
   - System validates credentials

2. **2FA Verification**:
   - System detects that 2FA is enabled for the account
   - System presents the 2FA verification screen
   - User opens their authenticator app and views the current code
   - User enters the 6-digit code

3. **Validation and Access**:
   - System validates the code against the stored secret
   - If valid, user is granted access to the protected area
   - If invalid, user is prompted to try again

### Disabling 2FA

1. **Access Settings**:
   - User navigates to the security settings
   - User views their current 2FA status (enabled)

2. **Disable 2FA**:
   - User clicks the "Disable Two-Factor Authentication" button
   - System prompts for confirmation
   - User confirms the action

3. **Confirmation**:
   - System disables 2FA for the account
   - System updates the user's security settings
   - User receives confirmation that 2FA has been disabled

## Recent Improvements

### UX Enhancements

1. **Removed Debug Features**:
   - Eliminated testing mode toggles from the verification component
   - Removed debug information displays
   - Streamlined the verification interface for a cleaner user experience

2. **Improved Recovery Code Display**:
   - Enhanced the recovery code display to ensure codes remain visible until explicitly acknowledged
   - Added clear instructions for saving recovery codes

3. **Consistent Button Styling**:
   - Updated button styles in the security settings to match the application's blue theme
   - Improved visual hierarchy and clarity of actions

4. **Removed Debug Components**:
   - Removed the AuthDebug component from the protected layout
   - Removed the PermissionDebug floating button
   - Created a cleaner, production-ready interface

### Technical Improvements

1. **Enhanced Time Drift Handling**:
   - Improved the validation logic to better handle time differences between devices
   - Implemented multiple validation approaches for maximum compatibility

2. **Robust Session Handling**:
   - Enhanced the setupTwoFactor function to handle session issues more gracefully
   - Improved error handling throughout the authentication flow

3. **Code Refactoring**:
   - Streamlined the verification component for better maintainability
   - Removed unnecessary debug and testing code
   - Improved code organization and documentation
