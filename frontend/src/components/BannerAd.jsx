import { useState, useEffect, useRef } from 'react';
import { apiFetchPublic } from '../lib/apiClient';

const AUTOPLAY_MS = 5000;

export function BannerAd() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    apiFetchPublic('/api/banners').then(setBanners).catch(() => setBanners([]));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [banners.length]);

  if (!banners.length) return null;

  const current = banners[currentIndex];

  function resetAutoplay() {
    clearInterval(timerRef.current);
    if (banners.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % banners.length);
      }, AUTOPLAY_MS);
    }
  }

  function nextBanner() {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    resetAutoplay();
  }

  function prevBanner() {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    resetAutoplay();
  }

  function goTo(i) {
    setCurrentIndex(i);
    resetAutoplay();
  }

  return (
    <section className="tm-banner-ad">
      <div className="tm-banner-container">
        <img src={current.image_url} alt={current.title || 'Publicidad'} className="tm-banner-image" />
        {current.link && (
          <a href={current.link} className="tm-banner-link" target="_blank" rel="noopener noreferrer" />
        )}
      </div>
      {banners.length > 1 && (
        <div className="tm-banner-controls">
          <button className="tm-banner-btn tm-prev" onClick={prevBanner}>‹</button>
          <div className="tm-banner-dots">
            {banners.map((_, i) => (
              <button
                key={i}
                className={`tm-dot ${i === currentIndex ? 'active' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
          <button className="tm-banner-btn tm-next" onClick={nextBanner}>›</button>
        </div>
      )}
    </section>
  );
}
