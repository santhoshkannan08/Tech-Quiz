# Data Structures Tech Quiz

Production-oriented React + Express + PostgreSQL + Prisma quiz platform built from `TECH QUIZ QUESTIONS AND ANSWER.pdf`.

## Requirements

- Node.js 20+
- PostgreSQL 14+

## Local setup

```powershell
Copy-Item .env.example .env
npm install
cd backend
npx prisma migrate dev --name init
npm run seed
cd ..
npm run dev
```

Open `http://localhost:5173`. The seeded quiz imports all 20 PDF questions and starts unpublished. Create the first administrator with `npm run admin:create --workspace backend`, then sign in at `/admin`.

The frontend is rooted at `frontend`, so its optional Vite environment file is
`frontend/.env` (copy `frontend/.env.example` there when overriding the API
URL). Restart the Vite dev server after changing `VITE_API_URL`. Local
`localhost` and `127.0.0.1` origins are allowed by the API.

## Production

```powershell
npm run build
npm run start --workspace backend
```

Deploy the frontend `frontend/dist` to a static host and set `VITE_API_URL` to the HTTPS API URL. Run Prisma migrations with `npx prisma migrate deploy --workspace backend`. Never commit `.env` or real credentials.

## Design guarantees

The published version stores exactly 15 selected question IDs. Each attempt transaction independently Fisher-Yates shuffles those IDs and each four-option list using cryptographically secure randomness, persists both orders, and never recalculates them while navigating or refreshing. Correct answers are only read by the server during submission.
