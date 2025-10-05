# Deployment Guide for Green Guardian

## Environment Variables for Vercel

When deploying to Vercel, make sure to set these environment variables in your Vercel dashboard:

### Firebase Configuration
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA0xk32VIw6J2yoqgHrn6icc5qDaEwX0Fw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=green-guardian-e8725.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=green-guardian-e8725
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=green-guardian-e8725.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913845808023
NEXT_PUBLIC_FIREBASE_APP_ID=1:913845808023:web:e62287dde00d108f5e32d2
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-SBD9WFLK64
```

## Deployment Steps

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "New Project"
3. Import your repository: https://github.com/ceijey/GreenGuardian-
4. Configure your project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)
5. Add all the environment variables listed above in the Environment Variables section
6. Click "Deploy"

## Post-Deployment

After deployment:
1. Your app will be available at a Vercel URL (e.g., greenguardian.vercel.app)
2. Test the login/signup functionality
3. Make sure Firebase authentication works correctly
4. Update your Firebase project settings if needed to allow your new domain

## Custom Domain (Optional)

If you want to use a custom domain:
1. Go to your Vercel dashboard
2. Click on your project
3. Go to Settings > Domains
4. Add your custom domain
5. Update DNS records as instructed by Vercel