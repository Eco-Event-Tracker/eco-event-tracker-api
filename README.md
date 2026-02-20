# Eco Event Tracker API - Foundation Only

TypeScript project foundation with:

- clean folder structure
- Sequelize models
- plain SQL migration files (`up` and `down`)
- Supabase-only environment template
- minimal health API (`GET /api/health`)

## Structure

```text
src/
  app.ts
  server.ts
  config/
  controllers/
  middlewares/
  models/
  routes/
  types/
migrations/
  001_init_up.sql
  001_init_down.sql
```

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
curl http://localhost:5000/api/health
```

## Migrations (Supabase)

Run the SQL files in Supabase SQL Editor in this order:

1. `migrations/001_init_up.sql`
2. (rollback if needed) `migrations/001_init_down.sql`
