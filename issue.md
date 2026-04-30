# Rencana Implementasi Fitur: CRUD To-Do List (Dynamic Path / ID)

## Deskripsi Tugas
Tugas ini adalah lanjutan dari implementasi To-Do List sebelumnya. Anda ditugaskan untuk membuat *endpoint* yang beroperasi pada satu spesifik `task` berdasarkan `id` (Dynamic Path). Sama seperti sebelumnya, semua *endpoint* ini harus diproteksi dan hanya bisa diakses oleh *user* yang sudah *login* (menggunakan `access_token`).

**PENTING (Security/Keamanan):**
Setiap operasi (GET, UPDATE, DELETE) **WAJIB** mengecek apakah task dengan `id` tersebut benar-benar milik `userId` yang sedang login. Jika task milik *user* lain, tolak dengan error (misal: 403 Forbidden atau 404 Not Found).

## Spesifikasi API

**Base URL**: `/api/v1/tasks/:id`
Semua route harus berada di dalam blok `.guard` yang mengekstrak `userId` dari token JWT. Parameter `id` di URL berbentuk angka (integer).

### 1. GET `/api/v1/tasks/:id`
- **Fungsi**: Mengambil detail satu task spesifik berdasarkan `id`.
- **Request**: Tidak ada body. Ambil `userId` dari token untuk validasi kepemilikan.
- **Response Sukses (200)**:
  ```json
  {
      "data": {
          "id": 1,
          "userId": 1,
          "title": "Belajar Elysia",
          "isCompleted": false,
          "deadline": "2026-05-10T10:00:00.000Z",
          "createdAt": "...",
          "updatedAt": "..."
      }
  }
  ```
- **Response Error**: `{"error": "error message"}`

### 2. PATCH/PUT `/api/v1/tasks/:id`
- **Fungsi**: Mengubah (Update) data task berdasarkan `id`.
- **Request Body (Partial Update / Fleksibel)**:
  Body yang dikirim bersifat dinamis. Jika *client* hanya mengirim `title`, maka hanya `title` yang di-*update*.
  *Contoh Body:*
  ```json
  {
      "title": "Judul Baru"
  }
  ```
  *Atau:*
  ```json
  {
      "isCompleted": true,
      "deadline": "2026-06-01T10:00:00.000Z"
  }
  ```
  *(Catatan untuk programmer: Gunakan validasi `t.Optional()` dari Elysia Typebox agar field bersifat opsional saat validasi).*
- **Response Sukses (200)**:
  ```json
  {
      "data": "ok"
  }
  ```
- **Response Error**: `{"error": "error message"}`

### 3. DELETE `/api/v1/tasks/:id`
- **Fungsi**: Menghapus task berdasarkan `id`.
- **Request**: Tidak ada body. Pastikan task milik `userId` yang sedang login.
- **Response Sukses (200)**:
  ```json
  {
      "data": "ok"
  }
  ```
- **Response Error**: `{"error": "error message"}`

## Struktur File yang Dimodifikasi

Gunakan struktur file yang sudah ada:

1. **`src/services/tasks-service.ts`**
   - Tambahkan fungsi `getTaskById(id: number, userId: number)`
   - Tambahkan fungsi `updateTask(id: number, userId: number, payload: UpdateTaskPayload)`
   - Tambahkan fungsi `deleteTask(id: number, userId: number)`

2. **`src/routes/tasks-routes.ts`**
   - Tambahkan *routing* baru `.get('/:id', ...)`, `.patch('/:id', ...)` (atau `.put`), dan `.delete('/:id', ...)` di dalam blok `.guard` yang sudah ada.
   - Parsing `params.id` dari URL menggunakan fitur validasi bawaan Elysia `params: t.Object({ id: t.Numeric() })`.

## Tahapan Implementasi (Langkah demi Langkah)

1. **Modifikasi Service (`src/services/tasks-service.ts`)**
   - Buat interface `UpdateTaskPayload` yang field-nya opsional (`Partial<CreateTaskPayload>`).
   - Tulis *query* Drizzle ORM (`db.query.tasks.findFirst`, `db.update`, `db.delete`).
   - **Ingat:** Tambahkan kondisi `.where(and(eq(tasks.id, id), eq(tasks.userId, userId)))` untuk menjamin keamanan (otorisasi kepemilikan data).
2. **Modifikasi Route (`src/routes/tasks-routes.ts`)**
   - Buat *endpoint* baru di bawah route `/api/v1/tasks` (sebelum atau sesudah route yang sudah ada, masih dalam *guard* yang memvalidasi JWT).
   - Validasi `params.id` menjadi `Number`.
   - Validasi `body` untuk metode UPDATE menggunakan `t.Object` dengan field-field opsional.
3. **Lakukan Pengujian Manual**
   - Tes ambil data spesifik dengan GET `/api/v1/tasks/1`.
   - Tes ubah judul saja.
   - Tes hapus task.
   - Tes (Eksperimen Keamanan): Coba ubah atau hapus *task* menggunakan token/akun milik pengguna lain, pastikan mengembalikan pesan *error* "Unauthorized" atau "Not found".
