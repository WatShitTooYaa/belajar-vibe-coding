# [Refactor]: Migrate Tasks to Workspace-based Ownership

## Deskripsi Tugas
Melanjutkan implementasi fitur Workspace pada Issue sebelumnya, kita perlu melakukan refaktorisasi pada logika dan routing Task. Saat ini, Task masih dikonsepkan sebagai entitas yang terikat langsung pada User secara personal (`userId`). Kita harus mengubahnya agar Task terikat pada Workspace (`workspaceId`), sesuai dengan perubahan schema database terbaru.

## 1. Refaktor Service (`src/services/tasks-service.ts`)

Karena struktur database tabel `tasks` telah berubah (menghapus `userId` dan menggantinya dengan `workspaceId`), kita harus memperbarui semua fungsi yang ada di dalam service.

### A. Fungsi yang perlu diubah:
1. **`getTasksByWorkspaceId`**: (Anda mungkin sudah memulai ini). Pastikan fungsi ini menerima argumen `workspaceId: number` dan melakukan query menggunakan kondisi `eq(tasks.workspaceId, workspaceId)`.
2. **`createTask`**:
   - Ubah parameter menjadi: `createTask(payload: CreateTaskPayload, workspaceId: number)`
   - Pada saat `db.insert`, ubah payload dengan memasukkan `workspaceId` (bukan `userId` lagi).
3. **`getTaskById`**:
   - Ubah parameter menjadi: `getTaskById(id: number, workspaceId: number)`
   - Ubah query pencarian: `where: and(eq(tasks.id, id), eq(tasks.workspaceId, workspaceId))`
4. **`updateTask` & `deleteTask`**:
   - Sama seperti di atas, ganti parameter `userId` menjadi `workspaceId`.
   - Perbarui kondisi `where` di dalam kueri `update` dan `delete` Drizzle.

## 2. Refaktor Routing (`src/routes/tasks-routes.ts`)

Routing untuk Task tidak lagi diakses langsung secara global (misal: `/api/v1/tasks`), melainkan harus berjalan di dalam konteks sebuah Workspace, contoh URL yang diharapkan: `/api/v1/workspaces/:workspaceId/tasks`.

### A. Perubahan Path & Parameter:
- Pastikan setiap endpoint HTTP (`GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`) dikonfigurasi untuk menangkap URL parameter `workspaceId`.
- Anda bisa me-mount (menggabungkan) Elysia instance dari `tasksRoutes` ke dalam `workspacesRoutes` untuk mencapai struktur URL nested ini.

### B. Otorisasi Member (Sangat Penting!):
Sebelum endpoint mengeksekusi aksi Task apapun (melihat, membuat, menghapus), sistem **wajib** memvalidasi apakah user yang sedang login memiliki hak akses ke workspace tersebut.

## 3. Tahapan Implementasi (Step-by-Step)

Anggap ini sebagai checklist kerjamu:

### Langkah 1: Buat Pengecekan Otorisasi Member
Di file `src/services/workspaces-service.ts`, tambahkan satu fungsi baru untuk memeriksa keanggotaan:
```typescript
export const checkWorkspaceMember = async (workspaceId: number, userId: number) => {
    // 1. Query ke tabel `workspaceMembers`
    // 2. Cari data yang cocok dengan workspaceId dan userId
    // 3. Return true jika ada (member), atau false jika tidak ada.
}
```

### Langkah 2: Update Logika Bisnis Task
Buka `src/services/tasks-service.ts`:
- Sapu bersih semua variabel dan argumen bernama `userId` di fungsi-fungsi tersebut dan ganti menjadi `workspaceId`.
- Pastikan tidak ada syntax error dari Drizzle ORM setelah refaktor.

### Langkah 3: Update Routing Task
Buka `src/routes/tasks-routes.ts`:
1. Ubah konfigurasi `t.Object` untuk `params` agar menerima `workspaceId: t.Numeric()`.
2. Di dalam handler tiap endpoint (misal `post('/')`), lakukan hal berikut secara berurutan:
   - Ambil `userId` dari token JWT.
   - Ambil `workspaceId` dari params.
   - Panggil fungsi `checkWorkspaceMember(workspaceId, userId)`.
   - Jika hasilnya *false*, langsung `set.status = 403` dan kembalikan pesan "Forbidden: Anda bukan member workspace ini".
   - Jika *true*, lanjutkan memanggil fungsi service task terkait (misal: `createTask(body, workspaceId)`).

### Langkah 4: Registrasi Nested Route (Opsional namun Disarankan)
Untuk membuat struktur URL menjadi `/api/v1/workspaces/:workspaceId/tasks`, pertimbangkan untuk me-register (menggunakan `.use()`) routing `tasksRoutes` di dalam file `workspaces-routes.ts`, lalu hapus registrasi independennya dari `index.ts`.

---
**Catatan Senior:**
Perhatikan baik-baik *Langkah 3b*. Jangan pernah membiarkan fungsi Task berjalan tanpa mengecek apakah user tersebut berhak mengakses Workspace itu. Keamanan data pengguna adalah prioritas! Baca dokumentasi Drizzle ORM jika ada error tipe data saat refaktor `where`. Semangat!
