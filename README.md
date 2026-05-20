# 🚪 Smart Door State Detection (Edge AI)

Sistem Computer Vision berbasis Edge AI untuk mendeteksi kondisi pintu secara realtime langsung di browser tanpa backend.

Model AI berjalan menggunakan ONNX Runtime Web, sehingga seluruh proses inference dilakukan secara lokal di perangkat pengguna.

---

## 🎯 Tujuan Project

Project ini dibuat sebagai simulasi sistem monitoring pintu otomatis yang dapat digunakan pada:

- Sistem keamanan ruangan
- Smart building monitoring
- Laboratorium atau ruang terbatas
- Sistem berbasis kamera (Computer Vision)

Semua proses berjalan secara **client-side**, sehingga data tidak dikirim ke server.

---

## ⚡ Fitur Utama

- 🚪 Deteksi pintu realtime via webcam
- 🧠 AI inference langsung di browser (Edge AI)
- ⚡ Tanpa backend / server
- 🔒 Privasi data (proses lokal)
- 📦 Model ringan format ONNX

---

## 🧠 Kelas Deteksi

- 🚪 Pintu Terbuka
- 🔒 Pintu Tertutup

---

## 🧩 Cara Kerja Sistem

1. Webcam menangkap video realtime
2. Frame diproses menggunakan canvas
3. Data dikonversi menjadi tensor
4. Model ONNX melakukan inference
5. Hasil deteksi ditampilkan sebagai bounding box

---

## 📂 Struktur Project

door-detection-ai/

│

├── index.html      # Tampilan aplikasi

├── app.js          # Engine AI & inference

├── style.css       # UI Styling

├── best.onnx       # Model AI

└── README.md


## 📊 Dataset & Training Model

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

---

## 🚀 Deployment (GitHub Pages)

Project ini hanya menggunakan file statis sehingga dapat di-hosting gratis.

Langkah deployment:

Upload repository ke GitHub
Pastikan file best.onnx berada di root project
Buka Repository Settings → Pages
Deploy dari branch main
Aplikasi siap digunakan melalui URL GitHub Pages

---

## 💡 Pengembangan Selanjutnya

Project ini dapat dikembangkan menjadi:

Smart Door Security System
Automatic Access Monitoring
Integrasi IoT Smart Home
Sistem Alarm Otomatis
Edge AI Surveillance

## 👨‍💻 Author

Dibuat oleh Nama Kamu

AI & Software Developer

Built with ☕, eksperimen AI, dan rasa penasaran tinggi.

## ⭐ Support

Jika project ini membantu atau menginspirasi, jangan lupa beri ⭐ pada repository ini.
