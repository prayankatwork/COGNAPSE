# COGNAPSE Production Deployment

## Vercel environment variables

Set these in the Vercel project (Production + Preview). **Do not** use `VITE_` for secrets.

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Yes | Cloud AI |
| `GROQ_API_KEY` | Yes | Cloud AI fallback |
| `FIREBASE_PROJECT_ID` | Yes | Same as client project |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account (escape newlines as `\n`) |
| `RAZORPAY_KEY_ID` | Yes | Payments |
| `RAZORPAY_KEY_SECRET` | Yes | Payments |
| `VITE_FIREBASE_*` | Yes | Client Firebase config |
| `VITE_RAZORPAY_KEY_ID` | Yes | Razorpay public key |

## Firebase

1. Deploy Firestore rules: `firebase deploy --only firestore:rules`
2. Enable Email/Password auth in Firebase Console.
3. Confirm `user_premium` is **not** writable from clients (rules block writes).

## Local development

- `npm run dev` — UI only; `/api/*` needs `npx vercel dev` for serverless routes.
- `npm run dev:vercel` — Full stack with APIs.
- `ALLOW_DEV_BYPASS=true` — Optional anonymous API access in non-production only.

## Security checklist

- [ ] All `VITE_GEMINI` / `VITE_GROQ` removed from Vercel (use server-only keys).
- [ ] `COGNAPSE_REQUIRE_AUTH` not set to `false` in production.
- [ ] Razorpay live keys in production, test keys in preview only.
- [ ] Firestore rules deployed.
