# Eco Event Tracker API - Foundation Only

TypeScript project foundation with:

- clean folder structure
- Sequelize models
- plain SQL migration files (`up` and `down`)
- Supabase/Postgres-ready environment template

No API endpoints are included.

## Structure

```text
src/
  config/
  models/
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

3. Set `DATABASE_URL` in `.env`.

4. Run migration up:

```bash
npm run db:migrate:up
```

5. Rollback all tables (if needed):

```bash
npm run db:migrate:down
```

## Notes

- SQL migrations are plain `.sql` files and can be run directly with `psql`.
- Models in `src/models` match the table schema.
