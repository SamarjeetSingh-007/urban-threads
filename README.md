# Urban Threads

A streetwear e-commerce web app built with Node.js, Express, and vanilla HTML/CSS/JS.

## How to run

```
npm install
npm start
```

Then open http://localhost:3000

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL) with local JSON fallback
- **Auth:** JWT + bcrypt
- **Deployment:** Vercel

## Folder Structure

```
frontend/       → all the UI pages, stylesheets, JS files
backend/sql/    → supabase schema files
server.js       → main express server (API + static serving)
api/            → vercel serverless entry point
scripts/        → helper scripts
```

## Supabase Setup

1. Run `backend/sql/supabase-schema.sql` in Supabase SQL editor
2. Run `backend/sql/supabase-relational-state.sql` in Supabase SQL editor
3. Set env vars in `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `USE_SUPABASE=true`

## Admin Login

- Email: `admin@urbanthreads.com`
- Password: whatever you set as `ADMIN_PASSWORD` in `.env`
