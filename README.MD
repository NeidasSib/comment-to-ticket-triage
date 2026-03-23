# Comment to Ticket Triage

A Spring Boot REST API that takes user comments and uses AI to decide if they should become support tickets. If yes, it generates a title, category, priority, and summary automatically. Triage runs asynchronously — comments respond immediately and update their status in the background.

**Stack:** Java 25 · Spring Boot 4.0.4 · Gradle · H2 (in-memory) · Hugging Face Inference API · Next.js 16

---

## Getting Started

### Requirements

- JDK 25
- A [Hugging Face](https://huggingface.co/settings/tokens) API token
- Node.js (only if running the frontend)

### Run the API locally

```bash
cd backend/triage-service
export HF_API_KEY=your_token_here   # Windows: set HF_API_KEY=your_token_here
./gradlew bootRun
```

API is available at `http://localhost:8080`.

### Run with Docker

```bash
docker build -f docker/Dockerfile -t triage-service .
docker run --rm -p 8080:8080 -e HF_API_KEY=your_token_here triage-service
```

### Run the tests

```bash
cd backend/triage-service
./gradlew test
```

HTML report is generated at `build/reports/tests/test/index.html`.

### Run the tests

```bash
cd backend/triage-service
./gradlew test
```

HTML report is generated at `build/reports/tests/test/index.html`.

### Run the frontend

```bash
cd frontend
cp .env.example .env.local   # edit if your API is not on localhost:8080
npm install
npm run dev
```

UI is available at `http://localhost:3000`.

**Frontend environment variables** (see `frontend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_URL` | `http://localhost:8080` | Server-side proxy target for Next.js rewrites |
| `NEXT_PUBLIC_API_URL` | *(unset)* | If set, the browser calls this URL directly instead of the proxy |

Leave `NEXT_PUBLIC_API_URL` unset when both frontend and API are co-deployed (e.g. Vercel + Railway) — the Next.js rewrite via `BACKEND_URL` avoids CORS.

---

## API Endpoints

### POST `/comments`
Submit a comment. Triage runs in the background — the response returns immediately with `triageStatus: "PENDING"`.

```bash
curl -X POST http://localhost:8080/comments \
  -H "Content-Type: application/json" \
  -d '{"text": "The app crashes after login."}'
```

```json
{
  "id": 1,
  "text": "The app crashes after login.",
  "createdDate": "2026-03-21T22:12:03.123456",
  "triageStatus": "PENDING"
}
```

Poll `GET /comments` to see the status update. Terminal statuses are `TICKET_CREATED`, `NO_TICKET`, and `FAILED`.

---

### GET `/comments`
Returns a paginated list of all comments.

```bash
curl "http://localhost:8080/comments?page=0&size=10&sort=createdAt,desc"
```

```json
{
  "content": [
    {
      "id": 1,
      "text": "The app crashes after login.",
      "createdDate": "2026-03-21T22:12:03.123456",
      "triageStatus": "TICKET_CREATED"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

| `triageStatus` | Meaning |
|----------------|---------|
| `PENDING` | Triage not yet started |
| `TICKET_CREATED` | AI decided this needs a ticket; see `/tickets` |
| `NO_TICKET` | AI decided no ticket is needed |
| `FAILED` | Triage call failed (HF error or timeout) |

---

### GET `/tickets`
Returns a paginated list of generated tickets.

```bash
curl "http://localhost:8080/tickets?page=0&size=10&sort=createdAt,desc"
```

```json
{
  "content": [
    {
      "id": 1,
      "title": "App crashes after login",
      "category": "BUG",
      "priority": "HIGH",
      "summary": "User reports application crash immediately after logging in.",
      "commentId": 1,
      "createdAt": "2026-03-21T22:15:08.456789"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

| Field | Values |
|-------|--------|
| `category` | `BUG` · `FEATURE` · `BILLING` · `ACCOUNT` · `OTHER` |
| `priority` | `LOW` · `MEDIUM` · `HIGH` |

---

### GET `/tickets/{id}`
Returns a single ticket by ID. Returns `404` if not found.

```bash
curl http://localhost:8080/tickets/1
```

```json
{
  "id": 1,
  "title": "App crashes after login",
  "category": "BUG",
  "priority": "HIGH",
  "summary": "User reports application crash immediately after logging in.",
  "commentId": 1,
  "createdAt": "2026-03-21T22:15:08.456789"
}
```

---

## Project Structure

```
.
├── backend/triage-service/   # Spring Boot API
├── docker/                   # Dockerfile (build context = repo root)
├── frontend/                 # Next.js UI
│   └── .env.example          # frontend environment template
├── .dockerignore
└── README.MD
```

---

## Notes

**Why Llama 3.1 and not flan-t5-base?**  
The Hugging Face router uses a chat completions API (`/v1/chat/completions`) that expects messages with roles. Llama 3.1 Instruct supports this format; flan-t5 doesn't. Swapping to another model is a single config change in `application.properties` as long as the model is chat-compatible.
