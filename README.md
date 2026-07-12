# Nivesh Ventures — Binary MLM Platform

Production-ready member + admin platform. Next.js 14, MongoDB Atlas, Firebase Auth, PWA-installable.

## 1. Install

```bash
npm install
cp .env.example .env
```

## github repo repush  :
``` 
git add . 
git commit -m "daily return today fix" 
git push -u origin main
```

Fill every value in `.env` — real MongoDB URI, real Firebase project, real SMTP account, real Web3Forms key, real support email/WhatsApp number. No placeholder data ships in the app; empty states show until real data exists.

## 2. Set up services

**MongoDB Atlas** — create a free/paid cluster, get connection string, put in `MONGODB_URI`.

**Firebase** — create a project, enable Email/Password auth (Authentication → Sign-in method). Copy the web config into `NEXT_PUBLIC_FIREBASE_*`. Then Project Settings → Service Accounts → Generate new private key, use its `project_id`, `client_email`, `private_key` for `FIREBASE_ADMIN_*` (keep the `\n` in the private key literal, wrapped in quotes).

**SMTP** — any provider (Gmail with an App Password, SendGrid, Mailgun, etc). Used to send real OTPs and welcome emails.

**Web3Forms** — get a free access key at web3forms.com, put in `WEB3FORMS_ACCESS_KEY`. Powers the support form; falls back to `mailto:` and WhatsApp automatically if it fails.

## 3. Run

```bash
npm run dev      # local dev
npm run build && npm start   # production
```

## 4. Create the first admin

New accounts register as `role: "member"` by default. To make one an admin, connect to your MongoDB Atlas cluster and run:

```js
db.users.updateOne({ email: "your-admin-email@gmail.com" }, { $set: { role: "admin" } })
```

## 5. Install as an app (PWA)

Once deployed over HTTPS, visiting the site on mobile shows an "Add to Home Screen" install prompt automatically (manifest + service worker wired in `next.config.mjs`).

## 6. Deploy

Any Node host works (Vercel, Railway, Render, your own VPS). Set every `.env` variable in the host's environment settings — nothing hardcoded.

## Structure

- `app/api/*` — real DB-backed API routes (auth, wallet, income, team, withdrawal, support, admin)
- `models/*` — Mongoose schemas (User, Transaction, Withdrawal, Investment, SupportTicket, Otp, Notice)
- `components/*` — Sidebar, Navbar, ChatbotWidget (FAQ + support), ReferralQRCard
- `lib/faqData.ts` — chatbot's FAQ content, edit freely
