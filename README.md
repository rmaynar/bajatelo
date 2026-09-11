# bajatelo - Universal Media & Video Downloader

**bajatelo** is a modern, fast, and containerized web application designed to fetch metadata and download audio/video from **YouTube, TikTok, Instagram, Twitter/X, Facebook, Twitch, SoundCloud, Reddit, Vimeo, and 1,000+ platforms** supported by `yt-dlp`.

---

## ✨ Features

- 🌐 **Multi-Platform Universal Downloader**: Works with URLs from:
  - **YouTube**: Videos, Shorts, Music.
  - **TikTok**: Videos with or without watermark.
  - **Instagram**: Reels, Posts, and Stories.
  - **Twitter / X**: Video tweets and clips.
  - **Facebook & Twitch**: Clips, streams, and VODs.
  - **SoundCloud & Bandcamp**: Audio tracks and podcasts.
  - **Reddit, Vimeo, Dailymotion** and [1,000+ sites supported by yt-dlp](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).
- 🖼️ **Media Metadata Preview**: Preview thumbnail, title, and duration before downloading.
- 🎵 **Multiple Output Formats**:
  - **MP4**: High-definition video with merged best audio streams.
  - **MP3**: Crystal-clear 320kbps extracted audio track.
- ⚡ **Asynchronous & Non-Blocking**: Built with FastAPI threadpools and background cleanup workers to keep operations responsive.
- 📊 **Real-time Download Traces**: In-memory download status logging (`/api/traces`) for observability and diagnostics.
- 🎨 **Modern Responsive UI**: Bilingual interface (English / Spanish) with clipboard paste integration and dark mode aesthetic.
- 🐳 **Docker Ready**: One-command deployment with Docker Compose.

---

## 🛠️ Tech Stack

- **Backend**:
  - [Python 3.11](https://www.python.org/)
  - [FastAPI](https://fastapi.tiangolo.com/)
  - [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Universal media extraction engine)
  - [FFmpeg](https://ffmpeg.org/) (Stream muxing & audio transcoding)
  - [Uvicorn](https://www.uvicorn.org/)
- **Frontend**:
  - [React 18](https://react.dev/)
  - [Vite](https://vitejs.dev/)
  - [Nginx](https://www.nginx.com/) (Production static server and reverse proxy)
- **Deployment**:
  - Docker & Docker Compose

---

## 📁 Project Structure

```text
.
├── backend/
│   ├── Dockerfile            # Python 3.11 + FFmpeg image
│   ├── main.py               # FastAPI backend with yt-dlp & logging
│   └── requirements.txt      # Python dependencies
├── frontend/
│   ├── Dockerfile            # Multi-stage build (Node build -> Nginx server)
│   ├── index.html            # HTML entry point (bajatelo UI)
│   ├── nginx.conf            # Nginx proxy configuration (/api -> backend:8000)
│   ├── package.json          # Frontend dependencies and build scripts
│   ├── src/
│   │   ├── App.jsx           # Main React component with multi-platform UI
│   │   ├── index.css         # Modern dark theme styles
│   │   └── main.jsx          # React bootstrap
│   └── vite.config.js        # Vite config
├── docker-compose.yml        # Docker Compose configuration (bajatelo services)
├── .gitignore                # Git ignore patterns
└── README.md                 # Project documentation
```

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.0+)

### Running bajatelo

1. Clone or navigate to the project directory:


2. Build and start the containers in detached mode:
   ```bash
   docker compose up --build -d
   ```

3. Open your browser and navigate to:
   ```
   http://localhost
   ```

To view logs:
```bash
docker compose logs -f
```

To stop containers:
```bash
docker compose down
```

---

## 💻 Local Development (Without Docker)

### Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ or 20+
- **FFmpeg**: Must be installed and accessible in your system's `PATH`.
  - *Ubuntu/Debian*: `sudo apt install ffmpeg`
  - *macOS*: `brew install ffmpeg`
  - *Windows*: `choco install ffmpeg` or `winget install Gyan.FFmpeg`

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend API interactive Swagger docs: `http://localhost:8000/docs`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend development server: `http://localhost:5173`

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Parameters |
|---|---|---|---|
| `POST` | `/api/info` | Extracts media metadata (title, duration, thumbnail) without downloading | JSON body: `{"url": "https://..."}` |
| `GET` | `/api/download` | Downloads and converts media stream to file | Query params:<br>• `url`: Target media URL<br>• `format_type`: `bestvideo+bestaudio/best` (MP4) or `bestaudio` (MP3) |
| `GET` | `/api/traces` | Retrieves recent download audit records (status, duration, file size) | *None* |

---

## 📜 Supported URL Examples

- **YouTube**: `https://www.youtube.com/watch?v=...` or `https://youtu.be/...`
- **TikTok**: `https://www.tiktok.com/@user/video/...`
- **Instagram**: `https://www.instagram.com/reel/...` or `https://www.instagram.com/p/...`
- **Twitter / X**: `https://x.com/user/status/...`
- **Twitch**: `https://www.twitch.tv/videos/...` or clips `https://clips.twitch.tv/...`
- **SoundCloud**: `https://soundcloud.com/artist/track-title`

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
