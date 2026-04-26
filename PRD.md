Product Requirements Document (PRD)
Project Name: Async Image Processing Web Application

Document Status: Final/Approved

Target Platform: Web (Desktop & Mobile Browser)

Tech Stack: * Frontend: React, Tailwind CSS

Backend: Node.js, Express JS

Language: TypeScript (Strict Mode)

Queueing System: BullMQ & Redis

Infrastructure: Docker & Docker Compose

1. Executive Summary
Aplikasi ini adalah sebuah platform web sederhana yang memungkinkan pengguna mengunggah gambar untuk diproses (resize, compress, dan convert format). Karena pemrosesan gambar memakan banyak resource CPU (CPU-intensive), sistem ini menggunakan arsitektur Asynchronous Worker. Request pengguna dari aplikasi React tidak akan diblokir oleh Express JS selama proses berjalan; sebaliknya, sistem akan langsung memberikan ID pekerjaan (job_id) sementara background worker menyelesaikan tugasnya secara terpisah.

2. Tujuan & Sasaran (Goals & Objectives)
Pemisahan Tugas (Separation of Concerns): Memisahkan server Express (penerima request) dengan worker (pengeksekusi tugas berat).

User Experience (UX): Menghindari timeout pada sisi pengguna saat memproses gambar berukuran besar dengan memberikan feedback instan berupa status pekerjaan pada UI.

Skalabilitas: Mendemonstrasikan pola production-ready di mana worker dapat di-scale secara independen dari server API.

3. Alur Pengguna (User Flow / Scenario)
Pengguna membuka halaman web dan memilih file gambar berukuran besar (maksimal 20MB).

Pengguna menekan tombol "Upload".

Server Express langsung menerima file, mengembalikan job_id, dan React menampilkan status "Pending".

Di belakang layar, Worker mengambil tugas tersebut dari Redis/Queue dan status berubah menjadi "Processing".

Frontend React secara berkala mengecek status pekerjaan tersebut ke server API (menggunakan teknik exponential backoff).

Setelah Worker selesai memproses gambar, status berubah menjadi "Completed".

React menampilkan tombol "Download" bergaya Tailwind yang memungkinkan pengguna mengunduh hasil gambar yang telah dioptimasi.

4. Functional Requirements (Kebutuhan Fungsional)
4.1. Frontend (React + Tailwind CSS)
Upload Form:

Komponen form menggunakan styling dari Tailwind CSS.

Menerima format file: .JPG, .PNG, atau .WebP.

Validasi ukuran maksimal file: 20MB di sisi klien (client-side validation).

Status Tracker:

Menampilkan job_id setelah upload berhasil.

Menampilkan indikator UI/UX (seperti spinner atau progress text) untuk status real-time: pending → processing → completed atau failed.

Polling Mechanism:

Menggunakan useEffect atau custom hook di React untuk melakukan fetching status secara berkala ke API menggunakan strategi Exponential Backoff (misal: jeda 1s, 2s, 4s, 8s).

Result & Error Handling:

Jika status completed: Munculkan tombol Download untuk mengambil file gambar WebP hasil pemrosesan.

Jika status failed: Tampilkan pesan error (misal: alert atau toast notification merah ala Tailwind) yang jelas.

4.2. Backend API (Express JS + TypeScript)
Konfigurasi Utama: Menggunakan TypeScript dengan konfigurasi strict: true di tsconfig.json. Middleware multer direkomendasikan untuk menangani unggahan multipart/form-data.

Endpoints yang Dibutuhkan:

POST /api/upload

Input: File multipart/form-data.

Proses: Simpan file sementara, buat job di antrean (BullMQ), lalu segera kembalikan response tanpa menunggu pemrosesan gambar selesai.

Output: JSON { "job_id": "uuid-string", "status": "pending" }.

GET /api/status/:job_id

Input: job_id di URL parameter.

Output: JSON berisi status terkini dari antrean { "job_id": "...", "status": "processing" }.

GET /api/download/:job_id

Input: job_id di URL parameter.

Output: Mengirimkan stream file gambar hasil pemrosesan menggunakan metode standar Express seperti res.download() (Header: Content-Type: image/webp).

4.3. Background Worker (Node.js Script)
Mekanisme: Menggunakan sistem antrean BullMQ terhubung ke Redis.

Job Lifecycle: Worker mendengarkan event antrean dan memperbarui status job berurutan: pending → processing → completed / failed.

Image Processing Requirements (Berurutan menggunakan sharp):

Resize: Ubah ukuran sisi terpanjang (longest side) menjadi maksimal 1280px, mempertahankan rasio aspek.

Compress: Kompresi gambar dengan kualitas 80%.

Convert: Ubah format output menjadi WebP.

5. Non-Functional Requirements & Bonus Points
Arsitektur & Infrastruktur:

Docker Compose: Seluruh stack (Frontend React, Backend Express, Worker Node.js, dan Redis) dapat dijalankan dengan perintah docker-compose up --build.

Resiliensi (Fault Tolerance):

Graceful Crash Handling: Jika Worker mati mendadak di tengah pemrosesan gambar, job tidak hilang secara permanen (memanfaatkan fitur retry/stalled jobs bawaan BullMQ).

Kualitas Kode:

Testing: Tersedia Unit Test (misal menggunakan Jest) untuk logika image processing di worker atau validasi input di Express.

Dokumentasi:

README.md: Menyertakan instruksi instalasi, cara menjalankan aplikasi, dan penjelasan arsitektur.

6. Struktur Direktori yang Disarankan
Plaintext
/project-root
 ├── /frontend          # Proyek React (Vite/CRA) + Tailwind CSS code
 ├── /backend           # Express JS API (Endpoints & Multer setup)
 ├── /worker            # Background process script (BullMQ Worker + Sharp)
 ├── /shared            # Shared TypeScript interfaces (Types untuk Job Payload)
 ├── docker-compose.yml # Konfigurasi container (React, Express, Worker, Redis)
 └── README.md          # Dokumentasi utama