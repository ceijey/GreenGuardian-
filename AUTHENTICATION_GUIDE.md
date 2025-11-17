# Green Guardian Authentication Features Guide

## Overview
This guide covers the new authentication features implemented in Green Guardian, including domain-based routing, terms and conditions, and password reset functionality.

---

## 1. Domain-Based Login Routing

### How It Works
The system automatically detects your email domain and routes you to the appropriate portal after login.

### Email Domain Rules

#### Government Officials
- **Email Domain:** `@gordoncollege.edu.ph`
- **Redirect To:** Government Portal (`/gov-portal`)
- **Example:** If you log in with `john.doe@gordoncollege.edu.ph`, you'll be automatically redirected to the Government Portal

#### Regular Users
- **Email Domain:** `@gmail.com` or any other domain
- **Redirect To:** User Dashboard (`/dashboard`) or role-specific portal
- **Examples:**
  - `user@gmail.com` → Dashboard (Citizen)
  - NGO account → NGO Portal
  - School account → School Portal
  - Private Partner → Partner Portal

### Technical Implementation
- Location: `lib/roleUtils.ts` - `getLoginRedirectPath()` function
- The function first checks the email domain
- Then checks the user's role from Firestore database
- Returns the appropriate redirect path

---

## 2. Terms and Conditions

### Overview
Both login and signup now require users to accept the Terms and Conditions before proceeding.

### Features

#### Terms Modal
- **Access:** Click "Terms and Conditions" link in the checkbox text
- **Content Includes:**
  - Acceptance of Terms
  - Use of Service
  - User Accounts
  - Privacy and Data Collection
  - User-Generated Content
  - Rewards and Points System
  - Community Guidelines
  - Intellectual Property
  - Limitation of Liability
  - Changes to Terms
  - Account Termination
  - Contact Information

#### On Login Page
1. Checkbox must be checked before signing in
2. Click the "Terms and Conditions" link to open the modal
3. Read through the terms
4. Click "I Accept" in the modal (or check the box manually)
5. Submit the login form

#### On Signup Page
1. Fill in your information (name, email, password, role)
2. Check the Terms and Conditions checkbox
3. Click "Terms and Conditions" link to read full terms
4. Accept terms and create account

### Validation
- ❌ Cannot login/signup without accepting terms
- ✅ Error message: "Please accept the Terms and Conditions to continue"

### Design
- Beautiful modal with smooth animations
- Scrollable content for easy reading
- Mobile-responsive design
- Keyboard accessible
- Screen reader friendly

---

## 3. Forgot Password Feature

### How to Reset Your Password

#### Step 1: Access Forgot Password
- Go to the login page
- Click "Forgot your password?" link below the sign-in button
- You'll be redirected to `/forgot-password`

#### Step 2: Enter Your Email
- Enter the email address associated with your account
- Click "Send Reset Email"

#### Step 3: Check Your Email
- Check your email inbox (and spam folder)
- You'll receive an email from Firebase Authentication
- Subject: "Reset your password for Green Guardian"

#### Step 4: Reset Password
- Click the link in the email
- You'll be redirected to Firebase's password reset page
- Enter your new password
- Confirm your new password
- Submit

#### Step 5: Login with New Password
- Return to the login page
- Use your email and new password
- Accept terms and conditions
- Sign in

### Important Notes
- ⏱️ Reset link expires after 1 hour
- 📧 Email must be registered in the system
- 🔒 Password must be at least 6 characters
- ✅ Success message appears when email is sent
- ↩️ Auto-redirects to login after 5 seconds

### Error Messages
- **Invalid Email:** "Please enter a valid email address"
- **Email Not Found:** Firebase will show appropriate error
- **Network Error:** "Failed to send password reset email. Please try again."

---

## 4. Email Verification

### Existing Feature (Maintained)
- All new accounts must verify their email before logging in
- Verification email sent automatically upon signup
- Cannot login until email is verified
- Can request resend verification email if needed

---

## 5. User Flow Diagrams

### Login Flow
```
User enters email & password
    ↓
Checks Terms & Conditions checkbox
    ↓
Clicks "Sign in"
    ↓
System validates credentials
    ↓
System checks email domain
    ↓
@gordoncollege.edu.ph? → Government Portal
Other domain? → Check role → Appropriate Portal
```

### Signup Flow
```
User enters information
    ↓
System detects @gordoncollege.edu.ph → Sets role to "government"
Other domain? → User selects role
    ↓
Checks Terms & Conditions
    ↓
Submits form
    ↓
Account created
    ↓
Verification email sent
    ↓
User verifies email
    ↓
User can login
```

### Password Reset Flow
```
User clicks "Forgot password?"
    ↓
Enters email address
    ↓
Clicks "Send Reset Email"
    ↓
Firebase sends reset email
    ↓
User clicks link in email
    ↓
User enters new password
    ↓
Password updated
    ↓
User returns to login
```

---

## 6. Technical Details

### Files Created
1. **`components/TermsModal.tsx`**
   - React component for terms modal
   - Props: `isOpen`, `onClose`, `onAccept`
   - Full terms and conditions content

2. **`components/TermsModal.module.css`**
   - Styling for the modal
   - Responsive design
   - Smooth animations

3. **`components/ForgotPasswordForm.tsx`**
   - Password reset form component
   - Email input and validation
   - Success/error messaging

4. **`components/ForgotPasswordForm.module.css`**
   - Styling for forgot password page
   - Consistent with login/signup design

5. **`app/forgot-password/page.tsx`**
   - Next.js page for password reset
   - Client-side component

### Files Modified
1. **`lib/roleUtils.ts`**
   - Added domain checking in `getLoginRedirectPath()`
   - Prioritizes email domain over role

2. **`lib/AuthContext.tsx`**
   - Added `resetPassword()` function
   - Imported `sendPasswordResetEmail` from Firebase

3. **`components/LoginForm.tsx`**
   - Added terms checkbox
   - Added forgot password link
   - Added terms validation

4. **`components/LoginForm.module.css`**
   - Added styles for terms container
   - Added styles for forgot password link

5. **`components/SignupForm.tsx`**
   - Added terms checkbox
   - Added terms validation

6. **`components/SignupForm.module.css`**
   - Added styles for terms container

### Firebase Functions Used
- `sendPasswordResetEmail(auth, email)` - Sends password reset email
- `sendEmailVerification(user)` - Sends verification email (existing)
- `signInWithEmailAndPassword(auth, email, password)` - Login (existing)
- `createUserWithEmailAndPassword(auth, email, password)` - Signup (existing)

---

## 7. Security Features

### Password Requirements
- Minimum 6 characters (Firebase default)
- Must match confirmation on signup
- Stored securely (hashed by Firebase)

### Email Verification
- Required before login
- Prevents spam accounts
- Ensures valid email addresses

### Terms Acceptance
- Required for both login and signup
- Legally protects the platform
- Users explicitly consent

### Domain Validation
- Government emails verified by domain
- Prevents unauthorized access to gov portal
- Automatic role assignment for .edu.ph emails

---

## 8. Accessibility Features

### WCAG 2.1 Compliance
- ✅ Keyboard navigation support
- ✅ Screen reader friendly
- ✅ High contrast mode support
- ✅ Focus indicators
- ✅ ARIA labels and roles
- ✅ Semantic HTML
- ✅ Error announcements

### Mobile Support
- 📱 Responsive design
- 📱 Touch-friendly buttons (44px minimum)
- 📱 Readable font sizes
- 📱 No horizontal scrolling

---

## 9. Troubleshooting

### Cannot Login
- ❓ **Problem:** "Please accept the Terms and Conditions"
- ✅ **Solution:** Check the Terms and Conditions checkbox

### Cannot Reset Password
- ❓ **Problem:** Not receiving reset email
- ✅ **Solutions:**
  - Check spam/junk folder
  - Wait a few minutes
  - Verify email address is correct
  - Try again with correct email

### Wrong Portal After Login
- ❓ **Problem:** Government official sent to wrong portal
- ✅ **Solution:** Ensure using @gordoncollege.edu.ph email

### Terms Modal Not Opening
- ❓ **Problem:** Click doesn't open modal
- ✅ **Solution:** Refresh page, check browser console for errors

---

## 10. Support

### Contact Information
- **Email:** support@greenguardian.ph
- **Issues:** Report on GitHub repository
- **Documentation:** See project README.md

### For Developers
- Check browser console for errors
- Verify Firebase configuration
- Check environment variables
- Test with development tools

---

## Appendix: Code Snippets

### Using the resetPassword function
```typescript
import { useAuth } from '@/lib/AuthContext';

const { resetPassword } = useAuth();

try {
  await resetPassword(email);
  // Success - email sent
} catch (error) {
  // Handle error
  console.error(error.message);
}
```

### Checking email domain
```typescript
const isGovOfficial = email.endsWith('@gordoncollege.edu.ph');
```

### Getting redirect path
```typescript
import { getLoginRedirectPath } from '@/lib/roleUtils';

const redirectPath = await getLoginRedirectPath(user);
router.push(redirectPath);
```

---

**Last Updated:** November 17, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
