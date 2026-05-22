# Deployment Status (auto-generated)

## Done

- **Production Vercel env**: `GEMINI_API_KEY`, `GROQ_API_KEY`, `FIREBASE_PROJECT_ID`, `RAZORPAY_*` on Production
- **Removed**: `VITE_GEMINI_API_KEY`, `VITE_GROQ_API_KEY` (no longer in Vercel)
- **Production deploy**: https://cognapse.vercel.app (live)

## You must finish (2 minutes)

### 1. Firestore rules (requires one-time login)

In terminal at project root:

```bash
npx firebase-tools login
npm run deploy:rules
```

Or paste `firestore.rules` in [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/cognapse-93cdf/firestore/rules) and publish.

### 2. Firebase Admin for premium/payments (missing from `.env`)

1. [Firebase Console → Project Settings → Service accounts](https://console.firebase.google.com/project/cognapse-93cdf/settings/serviceaccounts/adminsdk)
2. **Generate new private key** (downloads JSON)
3. Add to Vercel Production + Preview:
   - `FIREBASE_CLIENT_EMAIL` = `client_email` from JSON
   - `FIREBASE_PRIVATE_KEY` = `private_key` from JSON (paste as one line with `\n` for newlines)
4. Redeploy: `npm run deploy:prod`

### 3. Chrome extension reload

1. `chrome://extensions`
2. Find **COGNAPSE** → **Reload**
3. Sign in on https://cognapse.vercel.app first (refreshes extension token)

### Security note

If your Gemini API key appeared in any terminal log during setup, **rotate it** in Google AI Studio and update `GEMINI_API_KEY` in Vercel.
