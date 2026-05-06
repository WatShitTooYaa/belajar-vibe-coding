# Backend Tasks Tracker

## Tugas Baru (Untuk Junior Backend Developer)

### 1. Refactor Respons Auth (Login & Refresh)
*   **Konteks**: Saat ini, frontend membuat objek user "dummy" saat login karena endpoint `/api/auth/login` dan `/api/auth/refresh` hanya mengembalikan `{ data: 'ok' }`. Ketika frontend memuat ulang halaman (*refresh page*) dengan *refresh token*, sistem gagal membuat objek *dummy* sehingga menganggap pengguna belum login (mengembalikan `null`).
*   **Target Perbaikan**:
    *   Buka file `src/routes/user-routes.ts`.
    *   Pada route `POST /login`, modifikasi nilai *return* agar tidak lagi mengembalikan `{ data: 'ok' }`, melainkan mengembalikan data profil pengguna (gunakan data `user` yang sudah di-*query* dari database). Contoh: `return { data: { user } }`.
    *   Pada route `POST /refresh`, setelah proses pengecekan berhasil dan token baru di-*generate*, gunakan `refreshTokenDB.userId` untuk memanggil fungsi `getCurrentUser(refreshTokenDB.userId)`. Lalu kembalikan data user tersebut sebagai respons, misalnya: `return { data: { user: currentUser } }`.
*   **Tujuan**: Memastikan frontend menerima data profil asli (bukan sekadar status 'ok') setiap kali login dan perpanjangan sesi terjadi, sehingga komponen UI dapat menampilkan data yang akurat dan mencegah pengguna ter-logout secara tiba-tiba.
*   **Status**: Closed
