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

Model ini dilatih menggunakan dataset pintu dengan variasi kondisi nyata untuk meningkatkan akurasi deteksi di berbagai situasi.

### 📁 Dataset
Dataset mencakup berbagai kondisi:

- Sudut kamera yang berbeda
- Kondisi pencahayaan (terang, redup, gelap)
- Pintu terbuka sebagian dan penuh
- Lingkungan indoor yang beragam

🔗 Dataset Source (Roboflow):  
https://roboflow.com (ganti dengan link dataset kamu)

---

### ⚙️ Tahapan Training

Proses training model dilakukan melalui beberapa tahap:

1. Pengumpulan dan upload dataset ke Roboflow
2. Labeling objek pintu (Open / Closed)
3. Training model Object Detection (YOLO)
4. Evaluasi performa model
5. Export model ke format **ONNX**
6. Integrasi ke aplikasi web berbasis JavaScript

---

### 🧠 Training Pipeline

Model dilatih menggunakan workflow berbasis cloud untuk mempercepat eksperimen dan memudahkan proses iterasi.

🔗 Training Notebook (Google Colab):  
https://colab.research.google.com (ganti kalau kamu punya link sendiri)

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

Dibuat oleh Muhamad Fadlan & Edwin Prayoga

AI & Software Developer

Built with ☕, eksperimen AI, dan rasa penasaran tinggi.

## ⭐ Support

Jika project ini membantu atau menginspirasi, jangan lupa beri ⭐ pada repository ini.
