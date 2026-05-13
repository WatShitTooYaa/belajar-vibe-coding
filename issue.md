# Security Priority Fixes

## Context

Repository ini adalah backend to-do list berbasis Bun, Elysia, Drizzle ORM, PostgreSQL, dan JWT cookie auth.

Audit menemukan beberapa risiko keamanan prioritas tinggi yang perlu diperbaiki sebelum aplikasi dipakai di environment production.

Tujuan issue ini: implementasi hardening auth, refresh token, CORS, authorization workspace member, cookie security, dan error handling.

## Scope

Kerjakan hanya prioritas fix berikut:

1. Hapus fallback JWT secret lemah.
2. Hash refresh token sebelum disimpan di database.
3. Batasi CORS ke origin frontend yang diizinkan.
4. Tambahkan authorization check untuk endpoint member workspace.
5. Konsisten gunakan secure cookie di auth flow.
6. Jangan bocorkan internal error message ke client.

Jangan ubah fitur lain di luar scope ini kecuali perlu untuk test atau type correctness.

---

## 1. JWT Secret Must Be Required

### Problem

Saat ini beberapa file memakai fallback secret lemah:

- `src/index.ts`
- `src/routes/user-routes.ts`

Contoh pola buruk:

```ts
secret: process.env.JWT_SECRET || 'secret'
```

Jika env tidak di-set, attacker bisa menandatangani JWT sendiri memakai string `secret`.

### Required Changes

- Buat helper kecil untuk membaca `JWT_SECRET` secara aman, atau minimal konsisten validasi di setiap file.
- Jika `process.env.JWT_SECRET` kosong, aplikasi harus gagal start dengan error jelas.
- Hapus semua fallback `|| 'secret'`.
- Pastikan `JWT_SECRET` minimal 32 karakter.

### Suggested Implementation

Boleh buat file baru:

```txt
src/config/env.ts
```

Isi konsep:

```ts
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

export const env = {
    jwtSecret,
    nodeEnv: process.env.NODE_ENV ?? 'development',
    frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
};
```

Lalu gunakan `env.jwtSecret` di:

- `src/index.ts`
- `src/routes/user-routes.ts`
- `src/routes/workspaces-routes.ts`
- `src/routes/tasks-routes.ts`

### Acceptance Criteria

- Tidak ada string `|| 'secret'` di codebase.
- Aplikasi gagal start kalau `JWT_SECRET` kosong atau pendek.
- Semua plugin JWT memakai secret yang sama dari config.

---

## 2. Store Hashed Refresh Tokens

### Problem

Refresh token saat ini disimpan plain text di database:

- `src/db/schema.ts`
- `src/services/user-service.ts`

Jika database bocor, token bisa langsung dipakai attacker.

### Required Changes

- Simpan hash refresh token, bukan token asli.
- Gunakan SHA-256 atau SHA-512 untuk hash token random UUID.
- Saat lookup token, hash input token dulu, lalu query berdasarkan hash.
- Saat logout, hash token dulu, lalu delete berdasarkan hash.
- Rename konsep di code agar jelas, misalnya `tokenHash`.

### Database Options

Pilih salah satu:

#### Option A: Rename column

Rename `refresh_tokens.token` menjadi `token_hash`.

#### Option B: Keep column name temporarily

Tetap pakai kolom `token`, tapi isi dengan hash.

Option A lebih rapi, tapi butuh migration. Option B lebih cepat dan minim perubahan schema.

Untuk issue ini, Option B boleh jika ingin minim risiko.

### Suggested Helper

Boleh buat helper:

```txt
src/utils/token.ts
```

Konsep:

```ts
export const hashToken = async (token: string) => {
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};
```

Update functions:

- `createRefreshToken(userId, token)` simpan `hashToken(token)`.
- `findRefreshToken(token)` cari berdasarkan hash.
- `deleteRefreshToken(token)` delete berdasarkan hash.

### Acceptance Criteria

- Refresh token asli tidak pernah disimpan di DB.
- Login tetap mengirim refresh token asli ke cookie.
- Refresh endpoint tetap valid untuk token benar.
- Logout tetap menghapus token dari DB.

---

## 3. Restrict CORS Origin

### Problem

Saat ini CORS terbuka:

```ts
.use(cors())
```

Semua origin bisa mengakses API. Karena auth memakai cookie, ini berisiko jika credentials diaktifkan atau konfigurasi berubah.

### Required Changes

- Batasi CORS ke frontend React.
- Ambil origin dari env `FRONTEND_ORIGIN`.
- Aktifkan credentials hanya untuk origin yang dipercaya.

### Suggested Implementation

Di `src/index.ts`:

```ts
.use(cors({
    origin: env.frontendOrigin,
    credentials: true,
}))
```

Tambahkan `.env.example` jika belum ada:

```txt
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=change-me
DB_NAME=task_manager
JWT_SECRET=change-me-to-a-random-32-plus-character-secret
FRONTEND_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### Acceptance Criteria

- CORS tidak lagi wildcard.
- Origin frontend dapat diatur lewat env.
- Cookie auth masih jalan dari frontend lokal.

---

## 4. Protect Workspace Member Endpoints

### Problem

Endpoint ini hanya butuh JWT valid, tapi tidak cek apakah user adalah member/owner workspace:

- `POST /api/v1/workspaces/:workspaceId/members`
- `GET /api/v1/workspaces/:workspaceId/members`

Akibatnya user login bisa menambah atau melihat member workspace orang lain.

### Required Changes

- `GET /:workspaceId/members`: hanya member workspace yang boleh melihat member list.
- `POST /:workspaceId/members`: hanya `owner` yang boleh menambah member.
- Jika bukan member, return `403`.
- Jika member tapi bukan owner saat add member, return `403`.
- Jangan return detail internal.

### Suggested Implementation

Gunakan service existing:

```ts
getWorkspaceMember(workspaceId, userId)
```

Update import di `src/routes/workspaces-routes.ts`.

Pseudo logic untuk `POST /:workspaceId/members`:

```ts
const member = await getWorkspaceMember(workspaceId, userId);

if (!member) {
    set.status = 403;
    return { error: 'Forbidden' };
}

if (member.role !== 'owner') {
    set.status = 403;
    return { error: 'Forbidden' };
}
```

Pseudo logic untuk `GET /:workspaceId/members`:

```ts
const member = await getWorkspaceMember(workspaceId, userId);

if (!member) {
    set.status = 403;
    return { error: 'Forbidden' };
}
```

### Acceptance Criteria

- Non-member tidak bisa melihat members workspace.
- Non-member tidak bisa add member.
- `editor` dan `watcher` tidak bisa add member.
- `owner` bisa add member.

---

## 5. Secure Cookie Consistency

### Problem

Cookie login tidak konsisten dengan refresh. `access_token` dan `refresh_token` di login belum punya `secure` flag.

### Required Changes

- Semua auth cookies harus punya config konsisten:
  - `httpOnly: true` untuk `access_token` dan `refresh_token`.
  - `httpOnly: false` boleh hanya untuk `has_session` karena dipakai frontend sebagai indicator.
  - `secure: env.nodeEnv === 'production'`.
  - `sameSite: 'strict'` atau `sameSite: 'lax'` sesuai kebutuhan frontend.
  - `path: '/'`.
- Pertimbangkan `sameSite: 'lax'` jika frontend dan backend beda port di localhost masih perlu cookie flow lancar.

### Suggested Implementation

Buat helper cookie config supaya tidak copy-paste:

```txt
src/utils/cookies.ts
```

Konsep:

```ts
import { env } from '../config/env';

export const authCookieOptions = {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    path: '/',
    sameSite: 'strict' as const,
};

export const sessionIndicatorCookieOptions = {
    httpOnly: false,
    secure: env.nodeEnv === 'production',
    path: '/',
    sameSite: 'strict' as const,
};
```

### Acceptance Criteria

- Login dan refresh memakai config cookie yang sama.
- Production cookie memakai `secure: true`.
- `access_token` dan `refresh_token` tetap `httpOnly`.

---

## 6. Do Not Leak Internal Errors

### Problem

Banyak route mengembalikan `error.message` langsung ke client. Jika error berasal dari DB/ORM/runtime, informasi internal bisa bocor.

### Required Changes

- Return pesan generik untuk unexpected error:
  - `Internal Server Error`
  - `Unauthorized`
  - `Forbidden`
  - `Not Found`
  - `Bad Request`
- Log detail error di server dengan `console.error` atau logger yang sudah ada.
- Boleh tetap return pesan validasi bisnis yang aman, misalnya:
  - `Invalid email or password`
  - `Email or username already exists`
  - `User not found`
  - `User is already a member of this workspace`

### Suggested Implementation

Buat helper response error:

```txt
src/utils/http-errors.ts
```

Konsep:

```ts
export const internalError = (error: unknown) => {
    console.error(error);
    return { error: 'Internal Server Error' };
};
```

Atau per-route cukup ganti catch block:

```ts
catch (error) {
    console.error(error);
    set.status = 500;
    return { error: 'Internal Server Error' };
}
```

### Acceptance Criteria

- Unexpected DB/runtime error tidak dikirim mentah ke client.
- Error detail tetap tercatat di server log.
- Test existing auth tetap lolos atau diupdate sesuai behavior baru.

---

## Tests To Add Or Update

Tambahkan atau update test jika memungkinkan.

Minimal coverage:

1. App gagal start jika `JWT_SECRET` kosong atau pendek.
2. Login membuat refresh token yang tersimpan sebagai hash, bukan raw token.
3. Refresh berhasil dengan cookie refresh token valid.
4. Logout menghapus hashed refresh token.
5. Non-member tidak bisa akses `GET /:workspaceId/members`.
6. Editor/watcher tidak bisa `POST /:workspaceId/members`.
7. Owner bisa `POST /:workspaceId/members`.

Jika test setup DB belum stabil, minimal lakukan manual verification via API client dan tulis hasil di PR description.

---

## Manual Verification Checklist

- Jalankan server dengan `JWT_SECRET` pendek, pastikan gagal start.
- Jalankan server dengan `JWT_SECRET` valid, pastikan start normal.
- Login user, pastikan cookie `access_token`, `refresh_token`, dan `has_session` terset.
- Cek database `refresh_tokens`, pastikan value bukan UUID mentah.
- Refresh token, pastikan access token baru diterbitkan.
- Logout, pastikan refresh token dihapus dari database.
- Login user A owner workspace.
- Login user B non-member.
- User B akses members workspace user A, harus `403`.
- User B add member ke workspace user A, harus `403`.
- User A add member, harus sukses.

---

## Notes

- Jangan commit `.env`.
- Jika `.env` pernah ter-commit, buat follow-up issue untuk rotate semua secret dan bersihkan git history jika diperlukan.
- Tambahkan `.env.example` sebagai dokumentasi env yang aman.
- Jangan ubah database schema besar-besaran tanpa migration yang jelas.
