🚪 Smart Door State Detection AI

Sistem Computer Vision berbasis Edge AI untuk mendeteksi kondisi pintu Terbuka atau Tertutup secara realtime menggunakan kamera perangkat langsung dari browser.

Seluruh proses Artificial Intelligence berjalan sepenuhnya di sisi client (browser) menggunakan ONNX Runtime Web, tanpa server backend maupun pengiriman data ke cloud.

🎯 Deskripsi Project

Project ini merupakan simulasi sistem monitoring pintu otomatis yang dapat digunakan pada lingkungan keamanan modern seperti:

Smart Building
Monitoring Ruangan Terbatas
Sistem Keamanan Sekolah / Kantor
Smart Home Automation
IoT Vision System

Pendekatan edge-native inference memastikan:

✅ Latensi sangat rendah
✅ Privasi data kamera terjaga
✅ Tidak membutuhkan server tambahan

⚡ Fitur Utama
🚪 Deteksi kondisi pintu realtime
📷 Menggunakan webcam langsung
🧠 AI inference di browser
⚡ Zero backend system
🔒 Pemrosesan lokal (privacy-safe)
🎯 Bounding box otomatis
💻 Ringan & cepat dijalankan
🧠 Kelas Deteksi

Model AI mengenali dua kondisi:

🚪 Door Open — Pintu Terbuka
🔒 Door Closed — Pintu Tertutup
🏗️ Arsitektur Sistem

Alur kerja aplikasi:

Kamera menangkap video realtime
Frame dikirim ke canvas pemrosesan
Pixel diubah menjadi tensor AI
Model ONNX melakukan inference
Hasil deteksi divisualisasikan pada overlay canvas

Seluruh proses berjalan langsung pada browser menggunakan WebAssembly.

🛠️ Teknologi Yang Digunakan
HTML5
CSS3
JavaScript
ONNX Runtime Web
WebAssembly (WASM)
Roboflow Dataset
WebCam API
Computer Vision

📂 Struktur Project
door-detection-ai/
│
├── index.html      # Tampilan aplikasi
├── app.js          # Engine AI & inference
├── style.css       # UI Styling
├── best.onnx       # Model AI
└── README.md
📊 Dataset & Training Model

Model dilatih menggunakan dataset pintu dengan variasi:

Sudut kamera berbeda
Kondisi pencahayaan berbeda
Posisi pintu terbuka sebagian
Lingkungan indoor berbeda

Tahapan training:

Upload dataset ke Roboflow
Label objek pintu
Training model object detection
Export model format ONNX
Integrasi ke aplikasi web

🚀 Deployment (GitHub Pages)

Project ini hanya menggunakan file statis sehingga dapat di-hosting gratis.

Langkah deployment:

Upload repository ke GitHub
Pastikan file best.onnx berada di root project
Buka Repository Settings → Pages
Deploy dari branch main
Aplikasi siap digunakan melalui URL GitHub Pages
💡 Pengembangan Selanjutnya

Project ini dapat dikembangkan menjadi:

Smart Door Security System
Automatic Access Monitoring
Integrasi IoT Smart Home
Sistem Alarm Otomatis
Edge AI Surveillance

👨‍💻 Author

Dibuat oleh Nama Kamu

AI & Software Developer

Built with ☕, eksperimen AI, dan rasa penasaran tinggi.

⭐ Support

Jika project ini membantu atau menginspirasi, jangan lupa beri ⭐ pada repository ini.
