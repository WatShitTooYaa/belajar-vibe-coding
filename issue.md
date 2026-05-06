# Backend Tasks Tracker

## Tugas Baru (Untuk Junior Backend Developer)


### 1. Tambahkan Logging untuk Mempermudah Debugging
*   **Konteks**: Saat ini aplikasi belum memiliki sistem logging yang terstruktur. Hal ini menyulitkan proses pencarian akar masalah (debugging) ketika terjadi error, terutama pada endpoint krusial seperti authentikasi.
*   **Target Perbaikan**:
    *   Buka file `src/index.ts` dan/atau buat middleware/plugin logging baru.
    *   Implementasikan logging untuk mencatat setiap HTTP request yang masuk (method, path) dan response (status code, waktu eksekusi). Bisa menggunakan `@elysiajs/logger` jika tersedia atau buat custom logger sederhana di level global.
    *   Pastikan juga error (stack trace atau pesan error) dicatat di terminal/console saat terjadi eksepsi (exception) di dalam aplikasi.
*   **Tujuan**: Membantu developer memantau aktivitas server (traffic) dan melacak (trace) error dengan cepat melalui log yang informatif dan terstruktur di console/terminal.
*   **Status**: Open
