# [Feature Request]: Implement Workspaces API and Database Schema

## Deskripsi Tugas
Sebagai bagian dari pengembangan fitur kolaborasi, kita perlu menambahkan entitas `Workspace` ke dalam sistem. Fitur ini memungkinkan pembuatan workspace dan pengelolaan anggotanya (workspace members). 

Dokumen ini berisi instruksi spesifik untuk mengimplementasikan schema database dan endpoint dasar pembuatan workspace.

## 1. Perubahan Schema Database (Drizzle ORM)

Tambahkan schema berikut di file konfigurasi database (misal: `src/db/schema.ts` atau file schema terkait):

### A. Tabel `workspaces`
Buat tabel `workspaces` dengan spesifikasi berikut:
- `id`: Primary key (UUID atau Serial, sesuaikan dengan standar project)
- `name`: varchar(50), NOT NULL
- `created_by`: varchar(50), NOT NULL (Menyimpan ID user pembuat)
- `created_at`: timestamp, default: waktu saat ini

### B. Tabel `workspace_members` (Many-to-Many)
Buat tabel pivot `workspace_members` dengan spesifikasi berikut:
- `workspace_id`: Foreign Key ke tabel `workspaces`
- `user_id`: Foreign Key ke tabel `users`
- `role`: varchar atau enum (Contoh: 'owner', 'admin', 'member', 'viewer')
- **Primary Key**: Kombinasi (composite key) dari `workspace_id` dan `user_id`.

**Instruksi Tambahan DB:**
- Pastikan untuk men-generate file migration (misal: `bun run db:generate`) dan menjalankan migrasi ke database (misal: `bun run db:migrate`) setelah mengubah schema.

## 2. Struktur File & Folder
Gunakan standar struktur file dan folder berikut di dalam direktori `src/`:
- `src/routes/workspaces-routes.ts` (Untuk definisi routing endpoint Elysia)
- `src/services/workspaces-service.ts` (Untuk logika bisnis dan query database)

## 3. Implementasi API Endpoint

### Endpoint: Create Workspace
- **Method:** `POST`
- **Path:** `/api/workspaces`
- **Authentication:** Endpoint ini **HARUS** diproteksi dengan JWT middleware. Pastikan hanya user yang sudah login yang bisa mengaksesnya.

**Request Body:**
```json
{
  "name": "nama_workspace"
}
```

**Response Success (Status 200/201):**
```json
{
   "data": "ok"
}
```

**Response Error (Status 400/500):**
```json
{
   "error": "pesan error detail"
}
```

## 4. Tahapan Implementasi (Step-by-Step)

Untuk mempermudah pekerjaanmu, ikuti urutan pengerjaan berikut dengan saksama:

### Langkah 1: Update Schema Database
1. Buka file schema Drizzle (misal di `src/db/schema.ts`).
2. Deklarasikan tabel `workspaces` dan `workspace_members` sesuai spesifikasi di atas.
3. Jangan lupa mengatur relasi antar tabel (Foreign Keys) jika menggunakan Drizzle Relations.
4. Jalankan command migrasi untuk mengaplikasikan tabel baru ke PostgreSQL.

### Langkah 2: Buat Service (Logika Bisnis)
1. Buat file baru: `src/services/workspaces-service.ts`.
2. Buat fungsi asynchronous `createWorkspace(name: string, userId: string)`.
3. Di dalam fungsi ini, jalankan proses insert ke database. Sangat disarankan menggunakan **Database Transaction** agar data konsisten:
   - Insert data baru ke tabel `workspaces` dengan `name` dari input dan `created_by` = `userId`. Ambil `id` workspace yang baru di-insert.
   - Insert data baru ke tabel `workspace_members` menggunakan `workspace_id` yang baru didapat, `user_id` = `userId`, dan set default `role` = `'owner'`.
4. Return boolean/string "ok" jika berhasil, atau throw error jika gagal.

### Langkah 3: Buat Route (Elysia Endpoint)
1. Buat file baru: `src/routes/workspaces-routes.ts`.
2. Import instance Elysia, setup JWT middleware (agar mendapat akses ke `cookie.access_token` atau header otorisasi), dan import fungsi dari service.
3. Definisikan route `POST /` (nanti prefixnya diset sebagai `/api/workspaces` di instance).
4. Gunakan `guard` atau mekanisme otentikasi Elysia untuk memastikan user membawa token yang valid, lalu ekstrak ID user (sebagai `userId`) dari token tersebut.
5. Gunakan `t.Object` dari Elysia (TypeBox) untuk memvalidasi `body.name` (wajib berupa string, min length dll).
6. Panggil fungsi `createWorkspace(body.name, userId)` dari service.
7. Format balikan sesuai spesifikasi (`{"data": "ok"}` atau `{"error": ...}`).

### Langkah 4: Registrasi Route di Main App
1. Buka file utama `src/index.ts`.
2. Import `workspacesRoutes` yang baru dibuat.
3. Registrasikan ke instance Elysia utama, misalnya: `.use(workspacesRoutes)`.

### Langkah 5: Pengujian (Testing)
1. Jalankan lokal server (misal: `bun run dev`).
2. Gunakan Postman/Insomnia/Bruno:
   - Hit endpoint login terlebih dahulu untuk mendapatkan JWT Token.
   - Hit `POST /api/workspaces` dengan mengirimkan Bearer token / Cookie yang tepat beserta body json `{"name": "My Workspace"}`.
3. Pastikan response API sesuai dan cek di database apakah data tersimpan di kedua tabel (`workspaces` & `workspace_members`).

---
**Catatan Senior:**
Jika kamu menghadapi kendala saat mendefinisikan *Composite Primary Key* di Drizzle ORM, periksa dokumentasi resminya di bagian Indexes & Constraints. Tetap semangat dan selalu pastikan kodenya rapi dan type-safe!
