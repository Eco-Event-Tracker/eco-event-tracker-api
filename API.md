# API Reference

Base URL: `/api`

## Health
- `GET /health`

## Auth (Basic)
- `POST /auth/signup`
  - body: `{ "name": "string", "email": "string", "password": "string" }`
  - response: `{ user, token }`
- `POST /auth/login`
  - body: `{ "email": "string", "password": "string" }`
  - response: `{ user, token }`

## Events
- `GET /events`
  - header: `x-user-id: <user_uuid>`
  - lists events created by the user, newest first
  - response: `{ "events": [{ id, title, location, event_date, participant_count, is_virtual, estimated_co2, created_at }] }`
- `POST /events`
  - header: `x-user-id: <user_uuid>`
  - body:
  ```json
  {
    "title": "string",
    "location": "string",
    "event_date": "YYYY-MM-DD",
    "plan": { "...estimation inputs..." }
  }
  ```
- `GET /events/:eventId`
  - response: `{ title, location, event_date, plan, estimate }`
- `DELETE /events/:eventId`
  - header: `x-user-id: <user_uuid>`
  - deletes the event if it belongs to the user; `404` otherwise
  - response: `{ "id": "<eventId>" }`
- `GET /events/:eventId/report?format=pdf|csv`
  - downloads emission report file
  - default format: `pdf` (`format=csv` for spreadsheet export)
