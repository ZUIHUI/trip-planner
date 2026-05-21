# Firebase Deployment

This project uses Firestore as the source of truth and Realtime Database only for trip presence.

## Firebase Console Setup

Enable these products in the same Firebase project:

- Authentication: Email link and Google provider
- Cloud Firestore: production mode
- Realtime Database: locked mode
- Hosting
- Cloud Functions

## Environment

Set these values before building:

```bash
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
VITE_PRIMARY_OWNER_EMAIL=owner@example.com
```

Keep the existing Firebase web app keys in `.env` or `.env.local`.

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
firebase deploy --only firestore:rules,database,functions,hosting
```

Rules only:

```bash
firebase deploy --only firestore:rules,database
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
& "$NodeRoot\firebase.cmd" deploy --only firestore:rules,database,functions,hosting
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
