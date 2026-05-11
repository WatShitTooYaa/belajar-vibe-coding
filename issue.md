# [Feature]: Add Workspace Member Endpoint

## Deskripsi Tugas
Tugas ini bertujuan untuk mengimplementasikan fitur penambahan anggota (member) baru ke dalam sebuah Workspace yang sudah ada. Penambahan dilakukan dengan menggunakan email pengguna yang sudah terdaftar di sistem. Member yang baru ditambahkan juga akan diberikan role tertentu yang akan menentukan hak akses mereka terhadap Task di dalam workspace tersebut.

## Spesifikasi API
- **Endpoint**: `POST /api/v1/workspaces/:workspaceId/add_member`
  *(Catatan: kita menggunakan parameter URL `:workspaceId` untuk menentukan workspace mana yang akan ditambahkan member).*
- **Otentikasi**: Wajib (membutuhkan JWT Token).

**Request Body:**
```json
{
  "email": "teman@example.com",
  "role": "editor" // Hanya menerima "editor" atau "watcher"
}
```

**Response Sukses (200 OK):**
```json
{
   "data": "ok"
}
```

**Response Error (404 Not Found / 400 Bad Request):**
```json
{
   "error": "User not found" // Atau pesan error relevan lainnya
}
```

## Kebijakan Role (Role Policy)
1. **owner**: Otomatis diberikan kepada user yang pertama kali membuat workspace (Fitur ini sudah selesai diimplementasikan sebelumnya).
2. **editor**: User dapat melihat, membuat, mengedit, dan menghapus task di workspace ini.
3. **watcher**: User **hanya** dapat melihat (membaca) task di workspace ini. Tidak boleh mengubah data.

---

## Tahapan Implementasi (Panduan untuk Developer)

Ikuti langkah-langkah di bawah ini secara berurutan:

### Langkah 1: Update Service Layer (`src/services/workspaces-service.ts`)
1. Buat dan export fungsi baru bernama `addWorkspaceMember`.
2. Fungsi ini harus menerima parameter: `workspaceId` (number), `email` (string), `role` (string), dan `addedByUserId` (number - opsional untuk validasi keamanan).
3. **Logika Bisnis di dalam fungsi:**
   - **Lakukan pengecekan Email**: Gunakan Drizzle ORM untuk men-query tabel `users` (pastikan Anda meng-import `users` dari `schema.ts`). Cari user berdasarkan email dari parameter.
   - **Kondisi Tidak Ketemu**: Jika hasil query kosong, lemparkan error: `throw new Error("User not found")`.
   - **Kondisi Ketemu**: Ambil `id` dari user yang ditemukan.
   - *(Opsional/Best Practice)*: Cek dulu apakah user tersebut *sudah* ada di dalam tabel `workspaceMembers` untuk workspace ini. Jika sudah, tolak untuk menghindari duplikasi data.
   - **Insert Database**: Jika aman, jalankan perintah `db.insert(workspaceMembers).values(...)` dengan memasukkan `workspaceId`, `userId` yang ditemukan, dan `role`.

### Langkah 2: Buat Routing (`src/routes/workspaces-routes.ts`)
1. Cari chain Elysia (`workspacesRoutes`) dan tambahkan endpoint baru: `.post('/:workspaceId/add_member', async ({ params, body, userId, set }) => { ... })`.
2. Di dalam handler:
   - Ambil `workspaceId` dari params.
   - Ambil `email` dan `role` dari body.
   - Panggil fungsi `addWorkspaceMember` yang sudah Anda buat di service.
   - Tangkap error (blok `try-catch`). Jika error `User not found`, set status ke 404. Kembalikan response JSON yang sesuai.
3. **Validasi Request**: Gunakan TypeBox Elysia untuk memvalidasi request. Tambahkan argumen ketiga di method `.post`:
   ```typescript
   {
       params: t.Object({ workspaceId: t.Numeric() }),
       body: t.Object({
           email: t.String({ format: 'email' }),
           role: t.Union([t.Literal('editor'), t.Literal('watcher')])
       })
   }
   ```

### Langkah 3: Update Otorisasi Task (Tugas Lanjutan - Opsional di Issue Ini)
Sebagai kelanjutan dari sistem role ini, nanti Anda perlu membuka `src/routes/tasks-routes.ts` dan mengubah logika middleware otorisasi. 
Saat ini middleware tersebut hanya mengecek "Apakah user ini member?". Ke depannya, harus diubah menjadi:
- Untuk method `GET`: Role apa saja (`owner`, `editor`, `watcher`) boleh masuk.
- Untuk method `POST`, `PATCH`, `DELETE`: Hanya `owner` dan `editor` yang boleh lewat. Jika `watcher` mencoba, kembalikan error `403 Forbidden`.

### Langkah 4: Modifikasi Response Pengambilan Task (Tampilkan Username)
Buka file `src/services/tasks-service.ts` dan cari fungsi yang bertugas mengambil list task (misal `getTasksByWorkspaceId` dan `getTaskById`).
Saat ini, field `createdBy` pada task mengembalikan tipe data `number` (yaitu `user_id`). Anda harus mengubah ini agar API mengembalikan **username** pembuatnya.
1. Lakukan modifikasi kueri Drizzle ORM Anda. Anda bisa menggunakan metode `.leftJoin()` atau `.innerJoin()` dengan tabel `users` untuk mengambil kolom `username`.
2. Format ulang hasil kueri sebelum dikembalikan (return) oleh fungsi, sehingga properti `createdBy` berisi string `username` (misalnya: `createdBy: "Budi"`), bukan ID angka.

---
**Catatan Senior:**
Perhatikan baik-baik saat melakukan query ke tabel `users` dari dalam service `workspaces` dan `tasks`. Pastikan tabel tersebut di-import dengan benar dari skema database. Jangan ragu untuk melihat dokumentasi Drizzle ORM tentang operasi `JOIN` atau *Relational Queries* untuk menyelesaikan Langkah 4!
