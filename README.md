# Eco Event Tracker API

Available apis are documented in `./API.md`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env file:

```bash
cp .env.example .env
```

3. Run API:

```bash
npm run dev
```

4. Test health endpoint:

```bash
curl http://localhost:5002/api/health
```

## Migrations (Supabase)

Run the SQL files using Supabase CLI if needed.
