# Demo Request Feature

## Overview

The Demo Request feature provides a professional way for potential customers to request a personalized demonstration of the Data Modeler Cloud application. It replaces the previous "View Demo" button with a "Request a Demo" button that opens a modal contact form.

## Key Features

- **Modal Contact Form**: A clean, professional form that collects visitor information
- **Email Notification**: Automatically sends form submissions to a designated email address
- **Success Feedback**: Shows a success message for 5 seconds after submission
- **Form Validation**: Ensures required fields are completed before submission
- **Responsive Design**: Works seamlessly on all device sizes

## Technical Implementation

### Components

1. **Demo Request Modal** (`/components/demo-request-modal.tsx`)
   - React component that displays the contact form in a modal dialog
   - Handles form state, validation, and submission
   - Shows success or error messages based on submission status

2. **Demo Request API** (`/app/api/demo-request/route.ts`)
   - Next.js API route that processes form submissions
   - Validates required fields
   - Sends email notifications using Nodemailer
   - Returns appropriate success or error responses

3. **Hero Component Integration** (`/components/new-hero.tsx`)
   - Updated to replace "View Demo" with "Request a Demo" button
   - Manages modal open/close state

### User Flow

1. Visitor clicks the "Request a Demo" button on the homepage
2. A modal dialog appears with the contact form
3. Visitor fills out their information (first name, last name, email, etc.)
4. After submission, a success message appears for 5 seconds
5. The modal automatically closes after the success message
6. The site administrator receives an email with the visitor's information

## Configuration

### Environment Variables

The following environment variables must be set in `.env.local`:

```
# Demo Request Email Configuration
DEMO_REQUEST_EMAIL=your-email@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@example.com
SMTP_PASSWORD=your-smtp-password
```

### Variable Descriptions

- `DEMO_REQUEST_EMAIL`: The email address where demo requests will be sent
- `SMTP_HOST`: Your SMTP server hostname (e.g., smtp.gmail.com)
- `SMTP_PORT`: SMTP server port (typically 587 for TLS or 465 for SSL)
- `SMTP_SECURE`: Set to "true" for SSL (port 465) or "false" for TLS (port 587)
- `SMTP_USER`: Your SMTP server username/email
- `SMTP_PASSWORD`: Your SMTP server password or app password

### Gmail Configuration

If using Gmail as your SMTP provider:

1. Enable 2-Factor Authentication on your Google account
2. Generate an "App Password" specifically for this application
3. Use this App Password in the `SMTP_PASSWORD` environment variable

## Customization

### Form Fields

To modify the form fields, edit the `formData` state in `/components/demo-request-modal.tsx`:

```typescript
const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  companyName: '',
  companyWebsite: '',
  email: '',
  phoneNumber: ''
  // Add or remove fields as needed
});
```

Remember to also update:
- The form JSX to include your new fields
- The API validation in `/app/api/demo-request/route.ts`
- The email template in the API route

### Email Template

The email HTML template can be customized in the `mailOptions` object in `/app/api/demo-request/route.ts`:

```typescript
const mailOptions = {
  // ...
  html: `
    <h2>New Demo Request</h2>
    <!-- Modify the email template here -->
  `,
};
```

## Troubleshooting

### Common Issues

- **Emails not sending**: Verify SMTP credentials and ensure the email service allows sending from your application
- **Form submission errors**: Check browser console for detailed error messages
- **Modal not appearing**: Ensure there are no JavaScript errors in the console

### Testing the Email Functionality

To test the email functionality locally:

1. Set up proper SMTP credentials in your `.env.local` file
2. Submit the form with test data
3. Check your email inbox for the test message
4. Verify all form fields are correctly included in the email

If using Gmail, check your spam folder if emails are not appearing in your inbox.
