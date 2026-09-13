import os
import glob
import shutil
import tempfile
import time
import urllib.parse
import logging
from collections import deque
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
import yt_dlp

# Configurar logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
DEMO_MAX_DURATION = int(os.getenv("DEMO_MAX_DURATION", "0"))
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("bajatelo")

# Almacén en memoria para registrar trazas de descargas recientes
MAX_TRACES = 100
download_traces = deque(maxlen=MAX_TRACES)

def format_bytes(size: int) -> str:
    """Convierte bytes a un formato legible (KB, MB, GB)."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"

def record_trace(trace_type: str, url: str, status: str, details: dict):
    """Registra y emite trazas estructuradas sobre lo que se descarga o no."""
    trace_entry = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "type": trace_type,
        "url": url,
        "status": status,  # "SUCCESS", "FAILED", "STARTED"
        **details
    }
    download_traces.append(trace_entry)

    if status == "SUCCESS":
        logger.info(
            "=== [TRACE: DOWNLOADED] ===\n"
            "  - Title: %s\n"
            "  - Video ID: %s\n"
            "  - URL: %s\n"
            "  - File Name: %s\n"
            "  - Size: %s (%d bytes)\n"
            "  - Format: %s\n"
            "  - Processing Time: %.2fs\n"
            "============================",
            details.get("title"),
            details.get("video_id"),
            url,
            details.get("filename"),
            details.get("size_formatted"),
            details.get("size_bytes", 0),
            details.get("format"),
            details.get("duration_seconds", 0)
        )
    elif status == "FAILED":
        logger.error(
            "=== [TRACE: NOT DOWNLOADED] ===\n"
            "  - URL: %s\n"
            "  - Format: %s\n"
            "  - Reason: %s\n"
            "  - Elapsed Time: %.2fs\n"
            "===============================",
            url,
            details.get("format", "N/A"),
            details.get("error"),
            details.get("duration_seconds", 0)
        )
    else:
        logger.info(
            "=== [TRACE: DOWNLOAD STARTED] ===\n"
            "  - URL: %s\n"
            "  - Format: %s\n"
            "=================================",
            url,
            details.get("format")
        )

class YTDLPLogger:
    """Adaptador de logging para capturar eventos de yt-dlp."""
    def debug(self, msg: str):
        if msg.startswith("[debug] "):
            logger.debug(msg)
        else:
            logger.info(msg)

    def info(self, msg: str):
        logger.info(msg)

    def warning(self, msg: str):
        logger.warning(msg)

    def error(self, msg: str):
        logger.error(msg)

def _progress_hook(d):
    """Captura el progreso de descarga de yt-dlp."""
    status = d.get('status')
    if status == 'finished':
        filename = os.path.basename(d.get('filename', 'unknown'))
        logger.info("[TRACE: STREAM COMPLETE] Finished stream transfer for: %s", filename)
    elif status == 'error':
        logger.error("[TRACE: STREAM ERROR] Error during stream download: %s", d.get('filename'))

app = FastAPI(title="bajatelo API")

# Middleware para registro de peticiones HTTP
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    logger.info("Incoming request: %s %s from %s", request.method, request.url.path, client_ip)
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(
            "Completed request: %s %s - Status: %d - Duration: %.2fms",
            request.method,
            request.url.path,
            response.status_code,
            process_time
        )
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        logger.exception(
            "Unhandled exception for %s %s after %.2fms: %s",
            request.method,
            request.url.path,
            process_time,
            exc
        )
        raise exc

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

class InfoRequest(BaseModel):
    url: HttpUrl

def cleanup_dir(dirpath: str):
    """Elimina el directorio temporal tras servir el archivo."""
    if os.path.exists(dirpath):
        try:
            logger.info("Cleaning up temporary directory: %s", dirpath)
            shutil.rmtree(dirpath, ignore_errors=True)
            logger.debug("Successfully removed temporary directory: %s", dirpath)
        except Exception as e:
            logger.warning("Failed to remove temporary directory %s: %s", dirpath, e)

def _extract_info_sync(url: str):
    logger.info("Extracting metadata for URL: %s", url)
    ydl_opts = {
        'skip_download': True,
        'extract_flat': False,
        'logger': YTDLPLogger(),
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            raise RuntimeError("No metadata returned by yt-dlp")
        logger.info("Metadata extracted successfully for '%s' (ID: %s)", info.get("title"), info.get("id"))
        return info

def _download_sync(url: str, format_type: str, temp_dir: str):
    output_template = os.path.join(temp_dir, "%(id)s.%(ext)s")
    is_audio = (format_type == 'bestaudio')

    ydl_opts = {
        'format': 'bestaudio/best' if is_audio else format_type,
        'outtmpl': output_template,
        'merge_output_format': 'mp3' if is_audio else 'mp4',
        'logger': YTDLPLogger(),
        'progress_hooks': [_progress_hook],
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }] if is_audio else [{
            'key': 'FFmpegVideoConvertor',
            'preferedformat': 'mp4'
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        if not info:
            raise RuntimeError("No media info extracted during download")

        video_id = info.get("id")
        title = info.get("title", "download").replace("/", "_").replace("\\", "_")

        pattern = os.path.join(temp_dir, f"{video_id}.*")
        matches = glob.glob(pattern)
        if not matches:
            logger.error("Processed file not found in temp dir '%s' with pattern '%s'", temp_dir, pattern)
            raise RuntimeError("No se encontró el archivo procesado tras la descarga")

        file_path = matches[0]
        extension = os.path.splitext(file_path)[1]
        download_name = f"{title}{extension}"
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0

        return {
            "file_path": file_path,
            "download_name": download_name,
            "title": info.get("title"),
            "video_id": video_id,
            "file_size": file_size,
        }

@app.post("/api/info")
async def get_info(req: InfoRequest):
    """Devuelve metadatos del vídeo sin bloquear el event loop."""
    logger.info("Received /api/info request for URL: %s", req.url)
    try:
        info = await run_in_threadpool(_extract_info_sync, str(req.url))
        return {
            "id": info.get("id"),
            "title": info.get("title"),
            "thumbnail": info.get("thumbnail"),
            "duration": info.get("duration"),
            "demo_max_duration": DEMO_MAX_DURATION,
        }
    except Exception as e:
        logger.error("Error extracting info for %s: %s", req.url, e, exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/download")
async def download_video(
    background_tasks: BackgroundTasks,
    url: str = Query(..., description="URL del vídeo"),
    format_type: str = Query("bestvideo+bestaudio/best", description="Tipo o formato de descarga")
):
    """Descarga el vídeo de forma aislada sin bloquear el servidor."""
    start_time = time.time()
    record_trace("DOWNLOAD", url, "STARTED", {"format": format_type})

    # Validación básica de esquema URL
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        err_msg = f"URL inválida o esquema no soportado: {parsed.scheme}"
        record_trace("DOWNLOAD", url, "FAILED", {
            "format": format_type,
            "error": err_msg,
            "duration_seconds": time.time() - start_time
        })
        raise HTTPException(status_code=400, detail=err_msg)

    temp_dir = tempfile.mkdtemp(prefix="ytdl_")
    logger.debug("Created temporary directory: %s", temp_dir)
    try:
        result = await run_in_threadpool(_download_sync, url, format_type, temp_dir)
        background_tasks.add_task(cleanup_dir, temp_dir)

        duration = time.time() - start_time
        file_size = result["file_size"]

        record_trace("DOWNLOAD", url, "SUCCESS", {
            "title": result["title"],
            "video_id": result["video_id"],
            "filename": result["download_name"],
            "size_bytes": file_size,
            "size_formatted": format_bytes(file_size),
            "format": format_type,
            "duration_seconds": duration,
        })

        return FileResponse(
            path=result["file_path"],
            filename=result["download_name"],
            media_type="application/octet-stream"
        )
    except Exception as e:
        duration = time.time() - start_time
        record_trace("DOWNLOAD", url, "FAILED", {
            "format": format_type,
            "error": str(e),
            "duration_seconds": duration
        })
        cleanup_dir(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/traces")
async def get_traces():
    """Devuelve la lista histórica de descargas completadas y fallidas."""
    return JSONResponse(content=list(download_traces))
