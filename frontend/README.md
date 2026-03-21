# Comment to ticket triage (frontend)

Next.js UI for comments and tickets against a Spring API.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local`. Requests go to `/api/backend/*`, proxied to `BACKEND_URL` in `next.config.ts` (default `http://localhost:8080`). For direct browser calls to Spring, set `NEXT_PUBLIC_API_URL` and enable CORS on the server.

## API

- `POST /comments` — `{ "text": "..." }`
- `GET /comments` and `GET /tickets` — Spring `Page` with `page`, `size`, `sort=createdAt,desc` (see `DEFAULT_PAGE_SIZE` in `src/lib/triage-api.ts`).
