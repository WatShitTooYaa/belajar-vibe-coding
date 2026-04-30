# Rencana Implementasi Fitur: CRUD To-Do List (Tasks)

## Deskripsi Tugas
Tugas ini bertujuan untuk membuat fitur manajemen To-Do List (Tasks) untuk pengguna yang sudah terautentikasi. Semua akses ke endpoint ini harus dilindungi (Protected Route) dan hanya bisa diakses menggunakan `access_token` yang valid.

## Spesifikasi Database

Tambahkan definisi tabel `tasks` pada file `src/db/schema.ts`.

**Struktur Tabel `tasks`:**
- `id`: integer auto increment (Primary Key)
- `userId`: bigint unsigned (Foreign Key mereferensikan `users.id`). **PENTING**: Tipe data harus sama persis dengan `users.id` yaitu `bigint('user_id', { mode: 'number', unsigned: true })` agar tidak terjadi error relasi di MySQL.
- `title`: varchar (length: 255) Not Null
- `isCompleted`: boolean Not Null, Default: `false`
- `deadline`: datetime Not Null
- `createdAt`: timestamp Default: `now()`
- `updatedAt`: timestamp Default: `now()`, On Update: `now()`

## Spesifikasi API

**Base URL**: `/api/v1/tasks`
Semua route di bawah ini harus berada di dalam blok `.guard` atau menggunakan *middleware* yang memastikan request memiliki token JWT yang valid (mengambil `userId` dari token).

### 1. GET `/api/v1/tasks`
- **Fungsi**: Mengambil semua task milik user yang sedang login.
- **Request**: Tidak ada body. Ambil `userId` dari context autentikasi (token).
- **Response Sukses (200)**:
  ```json
  {
      "data": [
          {
              "id": 1,
              "user_id": 1,
              "title": "Belajar Elysia",
              "isCompleted": false,
              "deadline": "2026-05-10T10:00:00.000Z",
              "createdAt": "...",
              "updatedAt": "..."
          }
      ]
  }
  ```
- **Response Error**: `{"error": "error message"}`

### 2. POST `/api/v1/tasks`
- **Fungsi**: Menambahkan task baru.
- **Request Body**:
  *(Catatan untuk programmer: `user_id` sebaiknya diambil langsung dari JWT Token di backend demi keamanan, bukan dari body. Namun ikuti skema input DTO ini untuk validasi)*
  ```json
  {
      "title": "string",
      "isCompleted": boolean,
      "deadline": "string (format ISO-8601 datetime)"
  }
  ```
- **Response Sukses (200/201)**:
  ```json
  {
      "data": "ok"
  }
  ```
- **Response Error**: `{"error": "error message"}`

## Struktur Folder & File Baru

Buat dua file baru sesuai arsitektur yang sudah ada:

1. **`src/services/tasks-service.ts`**
   - Berisi logika bisnis yang berinteraksi langsung dengan database (menggunakan Drizzle ORM).
   - Buat fungsi `getTasksByUserId(userId: number)`
   - Buat fungsi `createTask(payload: CreateTaskPayload, userId: number)`

2. **`src/routes/tasks-routes.ts`**
   - Berisi definisi *routing* menggunakan Elysia JS.
   - Lakukan validasi `body` menggunakan tipe `t.Object` dari Elysia (`elysia/typebox`).
   - Terapkan *guard/derive* yang sama seperti pada `user-routes.ts` untuk memastikan hanya user yang login yang bisa mengaksesnya.

3. **Update `src/index.ts`**
   - Jangan lupa untuk meng-*import* `tasksRoutes` dan mendaftarkannya pada aplikasi Elysia utama (`app.use(tasksRoutes)`).

## Tahapan Implementasi (Langkah demi Langkah)

1. **Modifikasi Schema DB (`src/db/schema.ts`)**
   - Tambahkan skema tabel `tasks`.
2. **Buat Service (`src/services/tasks-service.ts`)**
   - Definisikan TypeScript Interface untuk payload.
   - Buat query Drizzle untuk `insert` dan `select` data.
3. **Buat Route (`src/routes/tasks-routes.ts`)**
   - *Setup* rute dengan Elysia.
   - *Copy* logika autentikasi (bagian `.derive`) dari `user-routes.ts` atau gunakan metode pembagian context jika memungkinkan, agar route terlindungi.
   - Pasang validasi request body untuk POST.
4. **Registrasi Route**
   - Daftarkan `tasksRoutes` di `src/index.ts`.
5. **Jalankan Migrasi Database**
   - Eksekusi perintah `bunx drizzle-kit push` (atau gunakan *migration script* manual) untuk menerapkan pembuatan tabel `tasks` di database MySQL.
6. **Lakukan Pengujian (Testing)**
   - Buat file `src/tests/tasks.test.ts` atau uji manual memastikan `user_id` tidak tertukar dengan user lain.
