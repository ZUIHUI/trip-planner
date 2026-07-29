# Firebase Deployment

This project uses Firestore as the source of truth and Realtime Database only for trip presence and lightweight live collaboration state.

## Firebase Console Setup

Enable these products in the same Firebase project:

- Authentication: Email/Password and Google provider
- Cloud Firestore: production mode
- Realtime Database: locked mode
- Cloud Storage: production mode
- Hosting
- Cloud Functions

### Authentication Setup

If Google login shows `auth/configuration-not-found`, the Firebase Auth product or provider is not fully configured for this project yet.

In Firebase Console for `trip-planner-36455`:

1. Open Build > Authentication.
2. Click Get started if Authentication has not been initialized.
3. Open Sign-in method.
4. Enable Google, set a public-facing project name and support email, then Save.
5. Enable Email/Password.
6. Open Settings > Authorized domains.
7. Confirm these domains are listed:
   - `trip-planner-36455.web.app`
   - `trip-planner-36455.firebaseapp.com`
   - `localhost`

Firebase CLI can deploy Hosting, Firestore rules, Realtime Database rules, and Functions from this repo, but sign-in providers are still configured in the Firebase Console.

Email verification-code login uses the `requestEmailLoginCode` callable Function to send a 6-digit code through Gmail SMTP, then signs in with a Firebase custom token after `verifyEmailLoginCode` accepts the code.

### Vercel Authentication Setup

When the app is served from Vercel, Firebase Auth can fail after Google consent with `missing initial state` because the app domain and Firebase Auth helper domain use different browser storage partitions.

This repo includes `vercel.json` rewrites for:

```text
/__/auth/*
/__/firebase/*
```

The app now pins the Firebase web config in `src/services/firebase.js` and uses `trip-planner-36455.firebaseapp.com` as the default `authDomain`. For Vercel deployments, configure these settings:

Firebase Console > Authentication > Settings > Authorized domains:

```text
trip-planner-mu-red.vercel.app
```

Keep the same Vercel domain in Firebase Auth authorized domains so Google sign-in and Firebase Auth helper flows can complete from the deployed app.

Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client > Authorized JavaScript origins:

```text
https://trip-planner-mu-red.vercel.app
```

Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client > Authorized redirect URIs:

```text
https://trip-planner-36455.firebaseapp.com/__/auth/handler
```

Do not put Google Maps, Places, Geocoding, or other provider keys in Vercel frontend env vars. Vercel does not need `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, or other Firebase web config overrides for this deployment. If those env vars already exist in Vercel, make sure they do not contain provider API keys; the app ignores them for Firebase initialization.

```text
VITE_FIREBASE_USE_CURRENT_DOMAIN_AUTH=false
```

If you use a custom domain on Vercel, set this env var and add the same domain to Firebase and Google OAuth:

```text
VITE_FIREBASE_USE_CURRENT_DOMAIN_AUTH=true
```

## Environment

The Firebase web app config is pinned in `src/services/firebase.js`. Set only app-level frontend options before building:

```bash
VITE_PRIMARY_OWNER_EMAIL=owner@example.com
VITE_GOOGLE_MAPS_EMBED_API_KEY=your_http_referrer_restricted_embed_key
```

`VITE_GOOGLE_MAPS_EMBED_API_KEY` is intentionally browser-visible because Google Maps Embed API requires the key in the iframe URL. Use a dedicated key restricted to Maps Embed API and these HTTP referrers:

- `https://trip-planner-36455.web.app/*`
- `https://trip-planner-36455.firebaseapp.com/*`
- `http://localhost:5173/*`
- `http://127.0.0.1:5173/*`

Store the value in ignored `.env.production.local` for production builds. Keep all other provider API keys in Firebase Functions secrets, and never reuse the server-only `GOOGLE_GEOCODING_API_KEY` for the iframe.

Cloud Storage is intentionally closed to browser clients by `storage.rules`. The app writes handbook cover images with Admin SDK and returns server-created Firebase Storage token URLs; clients must not be able to list, upload, delete, or read arbitrary bucket objects through the Firebase Storage SDK.

Email verification-code login uses Gmail SMTP. Use a dedicated Gmail account when possible, enable 2-Step Verification, then create a Google App Password for SMTP. Personal Gmail accounts are subject to Gmail sending limits, commonly 500 sent messages per day; if the limit is reached, sending can pause for 1 to 24 hours.

Configure non-sensitive Functions parameters in the ignored
`functions/.env.trip-planner-36455` file:

```env
GMAIL_SMTP_USER=your-gmail@gmail.com
WEB_PUSH_VAPID_PUBLIC_KEY=your_public_vapid_key
WEB_PUSH_VAPID_SUBJECT=mailto:your-gmail@gmail.com
EMAIL_FROM="Trip Planner <your-gmail@gmail.com>"
```

Configure the six sensitive Functions secrets before deploying Functions:

```bash
firebase functions:secrets:set GMAIL_SMTP_APP_PASSWORD
firebase functions:secrets:set EMAIL_CODE_PEPPER
firebase functions:secrets:set INVITE_CODE_PEPPER
firebase functions:secrets:set GOOGLE_GEOCODING_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set WEB_PUSH_VAPID_PRIVATE_KEY
```

Flight details are entered manually. The app no longer calls FlightAPI.io and
does not require `FLIGHTAPI_IO_KEY`.

After deploying these Functions, run
`firebase functions:secrets:prune --project trip-planner-36455` to destroy
Firebase-managed Secret versions no longer referenced by deployed Functions, including
`GMAIL_SMTP_USER`, `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_SUBJECT`, and
`FLIGHTAPI_IO_KEY`. Remove the legacy `RESEND_API_KEY` too when it is still
present. The prune command can miss manually created Secret versions without a
Firebase-managed label, so review those versions separately. Destroyed secret
versions cannot be restored.

AI trip recommendations use the `generateTripRecommendations` callable Function. Keep `OPENAI_API_KEY` as a Functions secret; optionally set `OPENAI_MODEL` as a Functions runtime environment value when a different OpenAI model should be used. Do not expose either provider key through `VITE_` frontend variables.

Email verification completes sign-in by creating a Firebase custom token. The Cloud Functions runtime service account must be able to sign tokens; if `verifyEmailLoginCode` logs `iam.serviceAccounts.signBlob` or `auth/insufficient-permission`, grant `roles/iam.serviceAccountTokenCreator` to the Functions service account on itself before redeploying Functions.

## Install

```bash
npm install
npm install -g firebase-tools
cd functions
npm install
cd ..
```

## Local Checks

```bash
npm run build
npm run functions:lint
```

Security rules checks require Firebase CLI emulators:

```bash
npm run firestore:rules:test
npm run database:rules:test
npm run storage:rules:test
```

## Deploy

Realtime Database rules can only be deployed after the Firebase project has a Realtime Database instance. If deploy fails with `It looks like you haven't created a Realtime Database instance in this project before`, create the default instance first.

Recommended setup:

1. Open Firebase Console.
2. Go to Build > Realtime Database.
3. Click Create database.
4. Choose a region and start in locked mode.
5. Copy the database URL into `.env.local` as `VITE_FIREBASE_DATABASE_URL`.

CLI setup:

```bash
firebase init database
firebase database:instances:list --project trip-planner-36455
```

If `firebase init database` asks about `database.rules.json`, keep the existing `database.rules.json` file and do not overwrite it with default rules.

First-time full deploy:

```bash
firebase login
firebase use --add
npm run build
firebase deploy --only firestore:rules,database,storage,functions,hosting
```

Rules only:

```bash
firebase deploy --only firestore:rules,database,storage
```

Hosting only:

```bash
npm run build
firebase deploy --only hosting
```

## Presence ACL Backfill

After the first Functions and Realtime Database rules deploy, backfill existing trip members into RTDB:

```bash
set FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
gcloud auth application-default login
npm run presence:backfill
```

Dry run:

```bash
npm run presence:backfill -- --dry-run
```

After backfill, new member changes are mirrored automatically by Cloud Functions.

## Claim Existing Ownerless Trips

Existing cloud trips that were created before account isolation may not have `access.ownerUid`. These trips must be claimed by the primary owner account before they appear in that account's trip list.

The primary owner email is:

```text
sky32439@gmail.com
```

UI path:

1. Sign in as `sky32439@gmail.com`.
2. Open the trip list.
3. Use the `既有雲端旅程 Owner 綁定` card.

The UI button calls the `claimExistingTrips` Cloud Function. The function uses Admin SDK after verifying the signed-in email is `sky32439@gmail.com`, so the browser does not need permission to scan or rewrite every `trips` document directly. If a trip is already owned by that UID, the function still syncs the owner member document so the trip list and collaboration membership stay aligned.

Admin script path:

```bash
gcloud auth application-default login
npm run owner:claim -- --dry-run
npm run owner:claim
```

With the portable Node helper:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task owner-claim-dry-run
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task owner-claim
```

The script looks up the Firebase Auth user by email, writes `access.ownerUid`, `access.ownerEmail`, `access.ownerName`, and creates `trips/{tripId}/members/{uid}` with `role = owner`. Trips that already have an owner are skipped and never overwritten.

If the old trips were already claimed by a test Firebase Auth UID, the UI claim and `owner:claim` will skip them. Use the repair command only after confirming those trips should belong to `sky32439@gmail.com`:

```bash
npm run owner:repair -- --dry-run
npm run owner:repair
```

With the portable Node helper:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task owner-repair-dry-run
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task owner-repair
```

`owner:repair` force-updates `access.ownerUid` to the Firebase Auth UID for the target email, creates the target owner member, and removes the previous owner member so the old account no longer sees the trip through the member collection. Other collaborators are kept.

## Windows Portable Node Flow

If Node is not installed globally, use the downloaded standalone Node folder as a temporary PATH. This does not permanently change Windows environment variables.

PowerShell may try to run `npm.ps1` and block it by execution policy. Use `npm.cmd` and `firebase.cmd` explicitly.

```powershell
$NodeRoot = 'D:\path\to\node-v24.15.0-win-x64\node-v24.15.0-win-x64'
$env:Path = "$NodeRoot;$env:Path"

& "$NodeRoot\node.exe" -v
& "$NodeRoot\npm.cmd" -v
```

Install dependencies and the Firebase CLI into the portable Node folder:

```powershell
& "$NodeRoot\npm.cmd" install
& "$NodeRoot\npm.cmd" install -g firebase-tools

cd functions
& "$NodeRoot\npm.cmd" install
& "$NodeRoot\npm.cmd" run lint
cd ..
```

Build and deploy:

```powershell
& "$NodeRoot\npm.cmd" run build
& "$NodeRoot\firebase.cmd" login
& "$NodeRoot\firebase.cmd" projects:list
& "$NodeRoot\firebase.cmd" use trip-planner-36455
& "$NodeRoot\firebase.cmd" deploy --only firestore:rules,database,storage,functions,hosting
```

You can also run the helper script from the project root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task check
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task install
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task login
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task database-init
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task database-list
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task deploy
```

For later partial deploys:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task rules
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task hosting
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task functions
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task artifacts-policy
```

On a first 2nd Gen Functions deploy, Firebase may enable Eventarc and related APIs, then fail while permissions propagate. If the error mentions `Permission denied while using the Eventarc Service Agent`, wait a few minutes and rerun the `functions` task.

If Functions are created but deploy ends with `could not set up cleanup policy`, run the `artifacts-policy` task. It sets an Artifact Registry cleanup policy for function container images in `asia-east1`, deleting images older than 7 days.

Backfill presence ACL after the first deploy. Use either gcloud application default credentials:

```powershell
gcloud auth application-default login
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task backfill-dry-run
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task backfill
```

Or set a local service account JSON path:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'D:\path\to\service-account.json'
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task backfill-dry-run
powershell.exe -ExecutionPolicy Bypass -File .\scripts\firebase-portable-node.ps1 -NodeRoot $NodeRoot -Task backfill
```

The Cloud Functions runtime remains Node 20. Node 24 is only used locally for CLI/build testing; if Firebase CLI or Functions deployment blocks on engine compatibility, switch this helper's `-NodeRoot` to a Node 22 LTS folder or use the Firebase standalone CLI.
