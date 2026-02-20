
1. Basic Tech Stack

Node.js
Express.js
PostgreSQL (with Supabase)
JWT for auth
Prisma / Sequelize


2. Main Entities (Database Tables)

- User
Stores organizers and admins.
* id (UUID / int, PK)
* name (string)
* email (string, unique)
* password (string, hashed)
* role (enum: `organizer`, `admin`)
* created_at (timestamp)


- Event
Stores event information.
* id (UUID / int, PK)
* title (string)
* location (string)
* event_date (date)
* attendance_count (int)
* created_by (FK → User.id)
* created_at (timestamp)


- EventEmissionData
Stores the emission inputs for each event.
* id (UUID / int, PK)
* event_id (FK → Event.id)
* energy_kwh (float)
* travel_km (float)
* catering_meals (int)
* waste_kg (float)
* total_co2 (float)  ← calculated result
* created_at (timestamp)



- EmissionFactor
Stores CO2 conversion factors.
* id (UUID / int, PK)
* category (string)
  (e.g. `energy`, `travel`, `catering`, `waste`)
* unit (string)
  (e.g. `kg_per_kwh`, `kg_per_km`)
* value (float)
* created_at (timestamp)



3. Basic Relationships

* One User → many Events
* One Event → one EventEmissionData
* Emission calculation uses EmissionFactor


4. Basic API Endpoints

Auth
* `POST /api/auth/register`
* `POST /api/auth/login`

Users (Admin only)
* `GET /api/users`
* `GET /api/users/:id`

Events
* `POST /api/events` → create event
* `GET /api/events` → list all events
* `GET /api/events/:id` → get event details
* `DELETE /api/events/:id`

Emissions
* `POST /api/events/:id/emissions`
- Input energy, travel, catering, waste
- System calculates total CO2 automatically
* `GET /api/events/:id/emissions`
- Returns breakdown + total

Emission Factors (Admin)
* `POST /api/factors`
* `GET /api/factors`
* `PUT /api/factors/:id`


5. Simple CO2 Calculation Logic

Example:
```
total_co2 =
  (energy_kwh × energy_factor) +
  (travel_km × travel_factor) +
  (catering_meals × catering_factor) +
  (waste_kg × waste_factor)
```
Factors are stored in the `EmissionFactor` table.


6. Folder Structure (Basic)
```
/src
  /controllers
  /routes
  /models
  /middlewares
  /utils
  app.js
```

