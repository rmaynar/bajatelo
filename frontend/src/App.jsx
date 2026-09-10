import { useState, useEffect } from 'react';

const TRANSLATIONS = {
  en: {
    logo: 'bajatelo',
    badge: 'Universal Downloader • Fast & Free',
    heroTitle1: 'Universal Video &',
    heroTitle2: 'Audio Downloader',
    heroSubtitle: 'Download videos and audio from YouTube, TikTok, Instagram, Twitter/X, Facebook, Twitch and 1,000+ platforms in highest quality MP4 or MP3.',
    supportedPlatformsLabel: 'Supported platforms include:',
    inputPlaceholder: 'Paste link from YouTube, TikTok, Instagram, X/Twitter, Twitch...',
    searchBtn: 'Search',
    searchingBtn: 'Fetching...',
    pasteTooltip: 'Paste from clipboard',
    clearTooltip: 'Clear input',
    downloadVideo: 'Download Video (MP4)',
    downloadAudio: 'Download Audio (MP3)',
    processingVideo: 'Processing Video...',
    processingAudio: 'Processing Audio...',
    processingNotice: 'Converting and merging media on the server. Your download will start automatically in a few moments.',
    duration: 'Duration',
    videoFormatTag: 'MP4 / Best Quality',
    audioFormatTag: 'MP3 / 320kbps Audio',
    feature1Title: '1,000+ Supported Sites',
    feature1Desc: 'Supports YouTube, TikTok, Instagram Reels/Posts, Twitter/X, Twitch, Facebook, SoundCloud, Reddit, and more.',
    feature2Title: 'Ultra Fast Processing',
    feature2Desc: 'Powered by yt-dlp & FFmpeg server pipeline for lossless format conversions and fast stream merging.',
    feature3Title: '100% Free & Private',
    feature3Desc: 'No registration, no accounts required, no telemetry. Direct downloads straight to your browser.',
    footer: 'bajatelo • Fast, Private & Free Universal Media Downloader',
    clipboardError: 'Unable to read clipboard. Please paste manually.',
    defaultError: 'Error fetching video information. Please verify the URL and try again.',
  },
  es: {
    logo: 'bajatelo',
    badge: 'Descargador Universal • Rápido y Gratis',
    heroTitle1: 'Descargador de',
    heroTitle2: 'Vídeo y Audio',
    heroSubtitle: 'Descarga vídeos y música de YouTube, TikTok, Instagram, Twitter/X, Facebook, Twitch y más de 1.000 plataformas en la máxima calidad MP4 o MP3.',
    supportedPlatformsLabel: 'Plataformas compatibles:',
    inputPlaceholder: 'Pega el enlace de YouTube, TikTok, Instagram, X/Twitter, Twitch...',
    searchBtn: 'Buscar',
    searchingBtn: 'Buscando...',
    pasteTooltip: 'Pegar del portapapeles',
    clearTooltip: 'Limpiar enlace',
    downloadVideo: 'Descargar Vídeo (MP4)',
    downloadAudio: 'Descargar Audio (MP3)',
    processingVideo: 'Procesando Vídeo...',
    processingAudio: 'Procesando Audio...',
    processingNotice: 'Convirtiendo y unificando streams en el servidor. La descarga comenzará automáticamente.',
    duration: 'Duración',
    videoFormatTag: 'Vídeo MP4 / Mejor Calidad',
    audioFormatTag: 'Audio MP3 / 320kbps',
    feature1Title: '+1.000 Sitios Compatibles',
    feature1Desc: 'Compatible con YouTube, TikTok, Instagram (Reels/Posts), Twitter/X, Twitch, Facebook, SoundCloud, Reddit y más.',
    feature2Title: 'Ultra Rápido',
    feature2Desc: 'Potenciado por yt-dlp y FFmpeg con procesamiento eficiente en servidor y fusión de flujos.',
    feature3Title: '100% Libre y Privado',
    feature3Desc: 'Sin registros, sin límites y con descargas directas a tu navegador sin intermediarios.',
    footer: 'bajatelo • Descargador Universal de Medios Rápido, Privado y Gratuito',
    clipboardError: 'No se pudo leer el portapapeles. Pega el enlace manualmente.',
    defaultError: 'Error al obtener información del vídeo. Comprueba la URL e inténtalo de nuevo.',
  }
};

const SUPPORTED_PLATFORMS = [
  { name: 'YouTube', icon: '▶' },
  { name: 'TikTok', icon: '🎵' },
  { name: 'Instagram', icon: '📷' },
  { name: 'Twitter / X', icon: '𝕏' },
  { name: 'Facebook', icon: '💬' },
  { name: 'Twitch', icon: '👾' },
  { name: 'SoundCloud', icon: '☁' },
  { name: 'Reddit', icon: '🤖' },
  { name: '+1000 more', icon: '✨' },
];

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return null;
  const sec = Math.floor(seconds);
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const remSec = sec % 60;
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${remSec.toString().padStart(2, '0')}`;
  }
  return `${mins}:${remSec.toString().padStart(2, '0')}`;
}

function App() {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('ytdl_lang') || (navigator.language.startsWith('es') ? 'es' : 'en');
  });
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  useEffect(() => {
    localStorage.setItem('ytdl_lang', lang);
  }, [lang]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Ignorar si no hay permisos de portapapeles
    }
  };

  const fetchInfo = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setVideoInfo(null);
    console.info(`[Frontend] Fetching video metadata for: ${url}`);
    
    try {
      const res = await fetch('/api/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || t.defaultError);
      }
      console.info('[Frontend] Video metadata received:', data);
      setVideoInfo(data);
    } catch (err) {
      console.error('[Frontend] Error fetching video info:', err);
      setError(err.message || t.defaultError);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && url.trim() && !loading) {
      fetchInfo();
    }
  };

  const handleDownload = async (formatType) => {
    setDownloading(formatType);
    setError('');
    console.info(`[Frontend] Starting download with format: ${formatType} for URL: ${url}`);

    const downloadUrl = `/api/download?url=${encodeURIComponent(url.trim())}&format_type=${encodeURIComponent(formatType)}`;

    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        let errorMsg = 'Error downloading file';
        try {
          const errData = await res.json();
          errorMsg = errData.detail || errorMsg;
        } catch (_) {
          const text = await res.text();
          if (text) errorMsg = text;
        }
        throw new Error(errorMsg);
      }

      // Obtener el nombre de archivo desde Content-Disposition
      let filename = videoInfo?.title ? `${videoInfo.title}.${formatType === 'bestaudio' ? 'mp3' : 'mp4'}` : 'download';
      const disposition = res.headers.get('Content-Disposition');
      if (disposition) {
        const filenameMatch = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      console.info('[Frontend] Download completed successfully');
    } catch (err) {
      console.error('[Frontend] Download error:', err);
      setError(err.message || 'Error during download');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="header-nav">
        <div className="logo-container">
          <div className="logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <span className="logo-text">{t.logo}</span>
        </div>

        {/* Language selector */}
        <div className="lang-selector">
          <button 
            type="button"
            className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
            onClick={() => setLang('en')}
            aria-label="Switch to English"
          >
            <span>🇺🇸</span> EN
          </button>
          <button 
            type="button"
            className={`lang-btn ${lang === 'es' ? 'active' : ''}`}
            onClick={() => setLang('es')}
            aria-label="Cambiar a Español"
          >
            <span>🇪🇸</span> ES
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
          {t.badge}
        </div>
        <h1 className="hero-title">
          {t.heroTitle1} <span>{t.heroTitle2}</span>
        </h1>
        <p className="hero-subtitle">
          {t.heroSubtitle}
        </p>
      </section>

      {/* Input Search Card */}
      <div className="search-card">
        <div className="input-group">
          <div className="input-wrapper">
            <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <input 
              type="text"
              className="search-input"
              placeholder={t.inputPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="input-actions">
              {url ? (
                <button 
                  type="button"
                  className="icon-action-btn" 
                  title={t.clearTooltip}
                  onClick={() => setUrl('')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              ) : (
                <button 
                  type="button"
                  className="icon-action-btn" 
                  title={t.pasteTooltip}
                  onClick={handlePaste}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <button 
            type="button"
            className="btn-fetch"
            onClick={fetchInfo} 
            disabled={loading || !url.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                <span>{t.searchingBtn}</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>{t.searchBtn}</span>
              </>
            )}
          </button>
        </div>

        {/* Supported Platforms Chips */}
        <div className="platforms-container">
          <span className="platforms-label">{t.supportedPlatformsLabel}</span>
          <div className="platforms-pills">
            {SUPPORTED_PLATFORMS.map((platform) => (
              <span key={platform.name} className="platform-pill">
                <span className="platform-pill-icon">{platform.icon}</span>
                <span>{platform.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Error Notification */}
      {error && (
        <div className="error-banner">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>{error}</div>
        </div>
      )}

      {/* Video Result Card */}
      {videoInfo && (
        <div className="video-card">
          <div className="video-grid">
            {videoInfo.thumbnail && (
              <div className="thumbnail-box">
                <img 
                  src={videoInfo.thumbnail} 
                  alt={videoInfo.title} 
                  className="thumbnail-img"
                  loading="lazy" 
                />
                {videoInfo.duration ? (
                  <span className="duration-badge">
                    {formatDuration(videoInfo.duration)}
                  </span>
                ) : null}
              </div>
            )}

            <div className="video-details">
              <div>
                <h2 className="video-title">{videoInfo.title}</h2>
                <div className="video-meta-tags">
                  <span className="meta-tag">{t.videoFormatTag}</span>
                  <span className="meta-tag">{t.audioFormatTag}</span>
                  {videoInfo.id && <span className="meta-tag">ID: {videoInfo.id}</span>}
                </div>
              </div>

              <div>
                <div className="download-buttons">
                  <button 
                    type="button"
                    className="btn-download btn-video"
                    disabled={Boolean(downloading)}
                    onClick={() => handleDownload('bestvideo+bestaudio/best')}
                  >
                    {downloading === 'bestvideo+bestaudio/best' ? (
                      <>
                        <span className="spinner"></span>
                        <span>{t.processingVideo}</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="23 7 16 12 23 17 23 7"></polygon>
                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                        </svg>
                        <span>{t.downloadVideo}</span>
                      </>
                    )}
                  </button>

                  <button 
                    type="button"
                    className="btn-download btn-audio"
                    disabled={Boolean(downloading)}
                    onClick={() => handleDownload('bestaudio')}
                  >
                    {downloading === 'bestaudio' ? (
                      <>
                        <span className="spinner"></span>
                        <span>{t.processingAudio}</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13"></path>
                          <circle cx="6" cy="18" r="3"></circle>
                          <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                        <span>{t.downloadAudio}</span>
                      </>
                    )}
                  </button>
                </div>

                {downloading && (
                  <div className="processing-notice">
                    <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(147, 197, 253, 0.4)', borderTopColor: '#93c5fd' }}></span>
                    <span>{t.processingNotice}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Highlights Grid */}
      <div className="features-grid">
        <div className="feature-box">
          <div className="feature-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </div>
          <h3 className="feature-title">{t.feature1Title}</h3>
          <p className="feature-desc">{t.feature1Desc}</p>
        </div>

        <div className="feature-box">
          <div className="feature-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3 className="feature-title">{t.feature2Title}</h3>
          <p className="feature-desc">{t.feature2Desc}</p>
        </div>

        <div className="feature-box">
          <div className="feature-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <h3 className="feature-title">{t.feature3Title}</h3>
          <p className="feature-desc">{t.feature3Desc}</p>
        </div>
      </div>

      <footer className="app-footer">
        {t.footer}
      </footer>
    </div>
  );
}

export default App;

