# Feature: User Login API & Session Management

## Deskripsi
Tugas ini bertujuan untuk mengimplementasikan fitur otentikasi (login) pengguna. Fitur ini mencakup pembuatan tabel `sessions` untuk melacak status login, implementasi JSON Web Token (JWT), dan pembuatan API endpoint login menggunakan Elysia JS dan Drizzle ORM.

## 1. Skema Database
Buat tabel baru bernama `sessions` di dalam file `src/db/schema.ts` dengan spesifikasi kolom berikut:
- `id`: integer, auto increment (primary key)
- `user_id`: integer, not null (foreign key yang merujuk ke id di tabel `users`)
- `token`: varchar, not null, unique (akan menyimpan string JWT Token dari user yang sedang login)
- `created_at`: timestamp, default `now()`
- `updated_at`: timestamp, default `now()`

## 2. Spesifikasi API Endpoint
Buat endpoint baru untuk memproses login pengguna.

- **Endpoint**: `POST /api/auth/login`
- **Request Body** (JSON):
  ```json
  {
      "email": "email@example.com",
      "password": "password123"
  }
  ```

- **Response Sukses**:
  ```json
  {
      "data": "eyJhbGciOiJIUzI1NiIsInR..." // JWT Token
  }
  ```

- **Response Error**:
  ```json
  {
      "error": "pesan error yang spesifik (contoh: 'Email atau password salah')"
  }
  ```

## 3. Struktur Folder dan Penamaan File
Lanjutkan penggunaan arsitektur standar yang telah ada di dalam folder `src`:
- **`src/routes/`**: Tempat untuk file routing Elysia. Anda dapat menambahkan ke `user-routes.ts` atau membuat file otentikasi baru.
- **`src/services/`**: Tempat untuk file *business logic*. Anda dapat menambahkan ke `user-service.ts` atau membuat file otentikasi baru.

---

## 4. Tahapan Implementasi

Berikut adalah panduan *high-level* untuk menyelesaikan fitur login ini:

### Langkah 1: Update Skema Database
- Buka file `src/db/schema.ts`.
- Tambahkan deklarasi tabel `sessions` beserta relasi *foreign key*-nya ke tabel `users`.
- Jangan lupa untuk mengekspor tabel `sessions` tersebut.
- Jalankan perintah *generate* pada Drizzle Kit untuk membuat file migrasi baru (misal: `bunx drizzle-kit generate`).
- Terapkan migrasi tersebut ke database MySQL.

### Langkah 2: Setup Mekanisme JWT
- Tentukan library/plugin JWT yang akan digunakan (karena menggunakan Elysia, sangat disarankan menggunakan plugin `@elysiajs/jwt`).
- Pastikan dependensi sudah ter-install dan terkonfigurasi dengan mengambil secret key dari file environment (`.env`).

### Langkah 3: Buat Service (Logika Bisnis)
- Buka file `src/services/user-service.ts` (atau file service terkait auth).
- Buat fungsi baru bernama `loginUser` yang menerima argumen `email` dan `password`.
- **Validasi User**: Lakukan *query* ke tabel `users` menggunakan Drizzle untuk mencari user berdasarkan `email`. Jika tidak ditemukan, *throw error* (misal: "Kredensial tidak valid").
- **Validasi Password**: Gunakan fungsi *verify* dari `Bun.password` (atau library *bcrypt* yang dipakai) untuk membandingkan plain-text `password` dari input dengan *hashed password* milik user di database. Jika tidak cocok, *throw error*.
- **Pembuatan Token**: Generate JWT token (payload bisa berisi `user_id` atau sekadar penanda sesi).
- **Penyimpanan Session**: Lakukan *insert* record baru ke tabel `sessions` menggunakan Drizzle. Simpan `user_id` yang sesuai dan `token` JWT yang baru saja di-generate.
- Fungsi harus mengembalikan token JWT tersebut.

### Langkah 4: Buat Route (API Endpoint)
- Buka file `src/routes/user-routes.ts`.
- Tambahkan route handler baru untuk method `POST /login` (bergabung menjadi `/api/auth/login`).
- Ekstrak `email` dan `password` dari body request dan aplikasikan validasi body jika menggunakan skema T (TypeBox) dari Elysia.
- Panggil service `loginUser` di dalam blok `try-catch`.
- **Handling Success**: Jika berhasil, format return menjadi `{ "data": "token_hasil_generate" }`.
- **Handling Error**: Jika terjadi exception (misal kredensial salah), atur HTTP status menjadi `401 Unauthorized` atau `400 Bad Request` dan kembalikan `{ "error": "pesan error dari exception" }`.

### Langkah 5: Pengujian
- Jalankan *development server*.
- Pastikan Anda sudah mendaftarkan sebuah user melalui endpoint `/api/auth/register` sebelumnya.
- Kirimkan HTTP POST request ke `/api/auth/login` dengan kredensial user tersebut.
- Pastikan server merespons dengan JSON yang berisi token, dan token tersebut berhasil masuk ke tabel `sessions` di database MySQL.
