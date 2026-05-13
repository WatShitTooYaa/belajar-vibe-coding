# Task Manager Backend

REST API backend untuk aplikasi to-do list berbasis workspace. Dibangun dengan Bun, Elysia, Drizzle ORM, dan PostgreSQL.

## Stack

| Layer | Teknologi |
|---|---|
| Runtime | [Bun](https://bun.com) v1.2+ |
| Framework | [Elysia](https://elysiajs.com) v1.4 |
| ORM | [Drizzle ORM](https://orm.drizzle.team) v0.45 |
| Database | PostgreSQL |
| Auth | JWT (cookie-based) + Refresh Token |
| Logging | logixlysia |
| Testing | Bun built-in test runner |

## Struktur Proyek

```
src/
├── config/
│   └── env.ts              # Validasi dan ekspor environment variables
├── db/
│   ├── index.ts            # Koneksi database
│   └── schema.ts           # Definisi tabel (users, workspaces, tasks, dll)
├── routes/
│   ├── user-routes.ts      # Auth endpoints
│   ├── workspaces-routes.ts # Workspace endpoints
│   └── tasks-routes.ts     # Task endpoints
├── services/
│   ├── user-service.ts     # Business logic auth
│   ├── workspaces-service.ts # Business logic workspace
│   └── tasks-service.ts    # Business logic task
├── tests/
│   ├── helpers.ts          # Shared test helpers
│   ├── auth.test.ts        # Auth endpoint tests
│   ├── workspaces-security.test.ts # Workspace security tests
│   └── tasks-security.test.ts     # Task security tests
├── utils/
│   ├── cookies.ts          # Cookie config helper
│   ├── http-errors.ts      # Error response helper
│   └── token.ts            # Token hashing utility
└── index.ts                # Entry point
drizzle/                    # Migration files
drizzle.config.ts           # Drizzle Kit config
```

## Prasyarat

- [Bun](https://bun.com) v1.2 atau lebih baru
- PostgreSQL (default port `5433`)

## Setup

### 1. Clone dan install dependencies

```bash
git clone https://github.com/WatShitTooYaa/task-workspace-backend.git
cd task-workspace-backend
bun install
```

### 2. Konfigurasi environment

Salin `.env.example` ke `.env` lalu sesuaikan nilainya:

```bash
cp .env.example .env
```

```env
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_NAME=task_manager
JWT_SECRET=your-random-secret-minimum-32-characters
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

> `JWT_SECRET` wajib diisi minimal 32 karakter. App akan gagal start jika tidak diset.

### 3. Jalankan migrasi database

```bash
bun run db:migrate
```

### 4. Jalankan server

```bash
bun run dev
```

Server berjalan di `http://localhost:3000`.

## Scripts

| Script | Perintah | Keterangan |
|---|---|---|
| `dev` | `bun run dev` | Jalankan server dengan hot reload |
| `db:generate` | `bun run db:generate` | Generate migration dari schema |
| `db:migrate` | `bun run db:migrate` | Push schema ke database |
| `test` | `bun test` | Jalankan semua test |

## API Endpoints

Base URL: `http://localhost:3000`

### Auth — `/api/auth`

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Daftar akun baru |
| `POST` | `/api/auth/login` | — | Login, set cookie |
| `POST` | `/api/auth/refresh` | refresh_token cookie | Perbarui access token |
| `DELETE` | `/api/auth/logout` | refresh_token cookie | Logout, hapus cookie |
| `GET` | `/api/auth/me` | access_token cookie | Data user saat ini |

### Workspaces — `/api/v1/workspaces`

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/workspaces` | ✅ | Daftar workspace user |
| `POST` | `/api/v1/workspaces` | ✅ | Buat workspace baru |
| `GET` | `/api/v1/workspaces/:workspaceId/members` | ✅ member | Daftar member workspace |
| `POST` | `/api/v1/workspaces/:workspaceId/members` | ✅ owner | Tambah member ke workspace |

### Tasks — `/api/v1/workspaces/:workspaceId/tasks`

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| `GET` | `/:workspaceId/tasks` | ✅ member | Daftar task di workspace |
| `POST` | `/:workspaceId/tasks` | ✅ owner/editor | Buat task baru |
| `GET` | `/:workspaceId/tasks/:id` | ✅ member | Detail task |
| `PATCH` | `/:workspaceId/tasks/:id` | ✅ owner/editor | Update task |
| `DELETE` | `/:workspaceId/tasks/:id` | ✅ owner/editor | Hapus task |

## Role & Permission

Setiap workspace memiliki sistem role:

| Role | Lihat Task | Buat/Edit/Hapus Task | Tambah Member |
|---|---|---|---|
| `owner` | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ❌ |
| `watcher` | ✅ | ❌ | ❌ |

> User yang membuat workspace otomatis menjadi `owner`.

## Auth Flow

Autentikasi menggunakan cookie HTTP-only:

1. `POST /api/auth/login` → set cookie `access_token` (15 menit) dan `refresh_token` (7 hari)
2. Setiap request ke protected endpoint kirim cookie `access_token` secara otomatis
3. Saat `access_token` expired, hit `POST /api/auth/refresh` dengan cookie `refresh_token`
4. `DELETE /api/auth/logout` menghapus refresh token dari DB dan clear semua cookie

Refresh token disimpan sebagai SHA-256 hash di database.

## Database Schema

```
users
  id, email (unique), username (unique), password (bcrypt), created_at, updated_at

workspaces
  id, name, created_by (→ users.id), created_at

workspace_members
  workspace_id (→ workspaces.id), user_id (→ users.id), role
  PRIMARY KEY (workspace_id, user_id)

tasks
  id, workspace_id (→ workspaces.id, CASCADE), created_by (→ users.id),
  title, is_completed, deadline, created_at, updated_at

refresh_tokens
  id, user_id (→ users.id), token (SHA-256 hash), expires_at
```

## Testing

Test menggunakan Bun built-in test runner. Membutuhkan koneksi database aktif.

### Jalankan semua test

```bash
bun test
```

### Jalankan test spesifik

```bash
# Auth flow
bun test src/tests/auth.test.ts

# Workspace security
bun test src/tests/workspaces-security.test.ts

# Task security
bun test src/tests/tasks-security.test.ts
```

### Coverage test

| File | Scope |
|---|---|
| `auth.test.ts` | Register, login, refresh, logout, /me |
| `workspaces-security.test.ts` | Member access control, role enforcement |
| `tasks-security.test.ts` | Non-member block, watcher block, payload validation |

## Security

- JWT secret wajib minimal 32 karakter, app gagal start jika tidak diset
- Refresh token disimpan sebagai SHA-256 hash, bukan plain text
- Cookie `access_token` dan `refresh_token` menggunakan `httpOnly: true`
- Cookie `secure: true` aktif di production (`NODE_ENV=production`)
- CORS dibatasi ke origin frontend via `FRONTEND_ORIGIN` env
- Role-based access control di setiap endpoint workspace dan task
- Error internal tidak dikirim ke client, hanya dicatat di server log

## Kontribusi

1. Fork repo
2. Buat branch dari `main`: `git checkout -b features/nama-fitur`
3. Commit perubahan
4. Push dan buat Pull Request ke `main`
