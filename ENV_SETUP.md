# Environment Variables Configuration

## Required Environment Variables

Make sure these environment variables are set in your deployment platform:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyA0xk32VIw6J2yoqgHrn6icc5qDaEwX0Fw
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=green-guardian-e8725.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=green-guardian-e8725
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=green-guardian-e8725.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=913845808023
NEXT_PUBLIC_FIREBASE_APP_ID=1:913845808023:web:e62287dde00d108f5e32d2
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-SBD9WFLK64
```

## Vercel Deployment

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable above with its corresponding value
3. Set the environment to "Production", "Preview", and "Development"
4. Redeploy your project

## Important Notes

- All Firebase config variables must start with `NEXT_PUBLIC_` to be available in the browser
- Make sure there are no spaces or extra characters in the values
- After adding environment variables, you need to redeploy the project