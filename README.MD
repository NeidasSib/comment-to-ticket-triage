# Comment → ticket triage

REST API for incoming comments. Each POST runs two Hugging Face calls: first pass decides ticket vs no ticket; if it’s a ticket, a second pass fills title, category, priority, and summary. Lists land in H2 (in-memory). There’s also a small Next.js UI under `frontend/` if you want buttons instead of curl.

Stack: Java 25, Spring Boot 4.0.4, Gradle, H2. The model is set in `application.properties` (`meta-llama/Llama-3.1-8B-Instruct:fastest` by default).

## Prerequisites

JDK 25 (Gradle uses the toolchain in `build.gradle`). A Hugging Face token with Inference access. Nothing else unless you’re touching the UI—then Node for `frontend/`.

## Run the API

```bash
cd backend/triage-service
export HF_API_KEY=hf_your_token_here
./gradlew bootRun
```

Default port is 8080. On Windows use `gradlew.bat` instead of `./gradlew`.

Docker (image build from repo root):

```bash
docker build -f docker/Dockerfile -t triage-service:local .
docker run --rm -p 8080:8080 -e HF_API_KEY=hf_your_token_here triage-service:local
```

## API

All list endpoints use Spring Data pagination: `page` (0-based), `size`, `sort` (e.g. `createdAt,desc`). Defaults apply if you omit query params.

### `POST /comments`

Body is JSON with a `text` field. Empty text returns 400.

```bash
curl -s -X POST http://localhost:8080/comments \
  -H "Content-Type: application/json" \
  -d '{"text":"The checkout page throws a 500 after I enter my card."}'
```

Example response (shape is stable; IDs and timestamps depend on your run):

```json
{
  "id": 1,
  "text": "The checkout page throws a 500 after I enter my card.",
  "createdDate": "2026-03-21T22:12:03.123456",
  "isTicketCreated": true
}
```

If triage says it’s not a ticket, you still get the saved comment; `isTicketCreated` is `false` and no ticket row is created.

### `GET /comments`

```bash
curl -s "http://localhost:8080/comments?page=0&size=10&sort=createdAt,desc"
```

Example (truncated page wrapper—your `pageable` block will have more fields):

```json
{
  "content": [
    {
      "id": 1,
      "text": "The checkout page throws a 500 after I enter my card.",
      "createdDate": "2026-03-20T22:15:03.123456",
      "isTicketCreated": true
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

### `GET /tickets`

```bash
curl -s "http://localhost:8080/tickets?page=0&size=10&sort=createdAt,desc"
```

Example page entry:

```json
{
  "content": [
    {
      "id": 1,
      "title": "Checkout returns HTTP 500 after card entry",
      "category": "BUG",
      "priority": "HIGH",
      "summary": "User reports server error during payment step after submitting card details.",
      "commentId": 1,
      "createdAt": "2026-03-21T22:15:08.456789"
    }
  ],
  "page": { "size": 10, "number": 0, "totalElements": 1, "totalPages": 1 }
}
```

Categories map to `BUG`, `FEATURE`, `BILLING`, `ACCOUNT`, `OTHER`. Priorities are `LOW`, `MEDIUM`, `HIGH`.

### `GET /tickets/{id}`

```bash
curl -s http://localhost:8080/tickets/1
```

Example:

```json
{
    "id": 1,
    "title": "Application Error After Update",
    "category": "BUG",
    "priority": "HIGH",
    "summary": "The application is stuttering after recent update.",
    "commentId": 2,
    "createdAt": "2026-03-21T14:57:35.931828"
}
```

Unknown id → 404.

## H2 console

With the default config it’s on at `http://localhost:8080/h2-console`. Use JDBC URL `jdbc:h2:mem:triage-service`, user `sa`, leave password blank. Open it when you want to inspect rows directly.

## Why Llama and not flan-t5-base?

The client hits Hugging Face’s **chat completions** route (`/v1/chat/completions` on the router). That API expects a chat-style payload (messages with roles). Flan-T5 isn’t wired through that path the same way. Llama 3.1 Instruct is. Swapping models is mostly a config change if the replacement speaks the same chat schema.

## Layout

```
.
├── backend/triage-service/    # Spring Boot app
├── docker/                    # Dockerfile
├── frontend/                  # Next.js dashboard
├── .dockerignore
└── README.md
```
