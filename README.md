# Prescriptions API

Backend del sistema de prescripciones médicas.

## Stack
- NestJS + TypeScript
- Prisma ORM + PostgreSQL
- JWT + Refresh Tokens
- RBAC con Guards/Decorators

## Setup local

### 1. Instalar dependencias
npm install

### 2. Variables de entorno
Crea un archivo `.env` con:
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_ACCESS_SECRET=supersecretaccess123
JWT_REFRESH_SECRET=supersecretrefresh456
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=7d
APP_ORIGIN=http://localhost:3000
PORT=3001

### 3. Migraciones y seed
npx prisma migrate dev
npx prisma db seed

### 4. Correr en desarrollo
npm run start:dev

## Cuentas de prueba
- admin@test.com / admin123
- dr@test.com / dr123456
- patient@test.com / patient123

## URLs
- API producción: https://prescriptions-api-production-0183.up.railway.app
- Frontend: https://TU-URL.vercel.app

## Endpoints principales
- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/refresh
- GET /api/auth/profile
- GET /api/prescriptions
- POST /api/prescriptions
- GET /api/prescriptions/:id
- PUT /api/prescriptions/:id/consume
- GET /api/prescriptions/:id/pdf
- GET /api/patients
- GET /api/admin/metrics
- GET /api/admin/prescriptions