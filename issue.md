# Feature: Get Current Logged In User API

## Deskripsi
Tugas ini bertujuan untuk mengimplementasikan fitur pengambilan profil pengguna yang sedang *login* (sering disebut fitur "Me"). Fitur ini membutuhkan mekanisme otorisasi yang membaca token JWT dari header request, memvalidasinya, dan memeriksa kecocokannya dengan data sesi yang tersimpan di database.

## 1. Spesifikasi API Endpoint
Buat endpoint baru untuk memproses permintaan pengambilan profil pengguna.

- **Endpoint**: `GET /api/auth/me`
- **Headers**:
  ```json
  {
      "Authorization": "Bearer <token_jwt>"
  }
  ```
  *(Catatan: Token yang dikirim harus merupakan token valid yang tersimpan di tabel `sessions` yang berelasi dengan tabel `users`)*

- **Response Sukses** (HTTP 200):
  ```json
  {
      "data": {
          "id": 1,
          "username": "nama_user",
          "email": "email@example.com"
      }
  }
  ```

- **Response Error** (HTTP 401 Unauthorized):
  ```json
  {
      "error": "Unauthorized"
  }
  ```

## 2. Struktur Folder dan Penamaan File
Tetap gunakan arsitektur *clean code* yang sudah berjalan:
- **`src/routes/`**: Tambahkan routing baru di dalam file `user-routes.ts`.
- **`src/services/`**: Tambahkan logika verifikasi dan *query* ke database di dalam file `user-service.ts`.

---

## 3. Tahapan Implementasi

Berikut adalah langkah-langkah *high-level* yang perlu dieksekusi:

### Langkah 1: Buat Service (Logika Bisnis)
- Buka file `src/services/user-service.ts`.
- Buat fungsi baru, misalnya `getCurrentUser`, yang menerima argumen `token` (string JWT asli tanpa awalan "Bearer ").
- **Verifikasi Session DB**: Gunakan Drizzle ORM untuk melakukan *query* ke tabel `sessions` dengan kondisi `token` yang dikirimkan.
- Jika data sesi tidak ditemukan, segera *throw error* (misal dengan pesan "Unauthorized").
- **Ambil Profil User**: Berdasarkan `user_id` yang didapat dari tabel `sessions`, lakukan *query* ke tabel `users` untuk mengambil detail profil (`id`, `username`, `email`). Anda juga dapat langsung menggunakan operasi *Join* (misalnya `innerJoin`) di Drizzle agar pengambilan data sesi dan user terjadi dalam satu eksekusi *query*.
- Pastikan Anda **tidak** mengikutsertakan kolom sensitif seperti `password` ke dalam hasil kembalian fungsi ini.

### Langkah 2: Buat Route (API Endpoint)
- Buka file `src/routes/user-routes.ts`.
- Tambahkan handler untuk `GET /me` (akan menjadi `/api/auth/me` jika mengikuti prefix yang ada).
- Di dalam handler, ekstrak nilai dari header `Authorization`. Biasanya dapat diakses melalui object `headers.authorization`.
- Pastikan header memiliki format `Bearer <token>`. Jika format salah atau header tidak ada, lemparkan pesan error "Unauthorized".
- Ambil string `<token>`-nya saja (pisahkan/hapus kata "Bearer ").
- *Opsional tapi direkomendasikan*: Gunakan metode `jwt.verify(token)` dari plugin `@elysiajs/jwt` untuk memastikan integritas kriptografis token sebelum menyentuh database.
- Panggil fungsi `getCurrentUser(token)` dari service yang telah dibuat di dalam blok `try-catch`.
- **Handling Success**: Jika berhasil, kembalikan response dengan format `{ "data": { ...profil_user... } }`.
- **Handling Error**: Jika terjadi exception apa pun (token tidak sah, kadaluarsa, tidak ada di DB), tangkap error tersebut, ubah status HTTP menjadi `401`, lalu kembalikan response `{ "error": "Unauthorized" }`.

### Langkah 3: Pengujian (Testing)
- Pastikan server berjalan tanpa error.
- Lakukan login terlebih dahulu via `POST /api/auth/login` dan catat token yang diberikan.
- Kirim HTTP GET request ke `http://localhost:3000/api/auth/me` menggunakan *tool* seperti Postman, Insomnia, atau `curl`, dengan memastikan header `Authorization` terisi token tersebut.
- Pastikan response mengembalikan informasi `id`, `username`, dan `email` Anda.
- Uji juga skenario kegagalan: request tanpa header, request dengan token acak, atau request dengan token yang sudah di-*tamper* (diubah), dan pastikan aplikasi merespons dengan `401 Unauthorized`.
