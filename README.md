# URBAN THREADS

Streetwear ecommerce app with a Node.js backend and a vanilla HTML/CSS/JS frontend.

## Project layout

```text
.
├── backend/
│   ├── data/                     # local JSON data store (non-Supabase mode)
│   └── sql/                      # Supabase SQL schemas/migrations
├── docs/
│   └── emailjs/                  # email template assets/docs
├── frontend/
│   ├── assets/
│   ├── js/
│   ├── styles/
│   ├── index.html
│   ├── shop.html
│   ├── product.html
│   ├── cart.html
│   ├── admin.html
│   ├── login.html
│   ├── signup.html
│   ├── wishlist.html
│   ├── about.html
│   ├── contact.html
│   ├── privacy.html
│   └── terms.html
├── scripts/
│   └── start-urban-threads.command
├── uploads/                      # uploaded product media (local storage mode)
├── server.js
├── package.json
└── .env
```

## Run locally

- Install dependencies: `npm install`
- Start server: `npm start`
- Open app: `http://localhost:3000`

The Express server serves both API endpoints and the frontend pages.

## Supabase setup (optional)

- Run `backend/sql/supabase-schema.sql` in Supabase SQL editor.
- Run `backend/sql/supabase-relational-state.sql` in Supabase SQL editor.
- Configure `.env` with:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `USE_SUPABASE=true`
- Restart with `npm start`.

## Default admin account

- Email: `admin@urbanthreads.com`
- Password: value of `ADMIN_PASSWORD` in `.env`

## Notes

- Do not open pages directly with `file://`; use `http://localhost:3000/...`.
- In local mode, uploads are served from `/uploads/...`.
