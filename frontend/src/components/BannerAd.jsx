import { useState, useEffect } from 'react';
import { apiFetchPublic } from '../lib/apiClient';

export function BannerAd() {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    apiFetchPublic('/api/banners').then(setBanners).catch(() => setBanners([]));
  }, []);

  if (!banners.length) return null;

  const current = banners[currentIndex];

  function nextBanner() {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }

  function prevBanner() {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
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
                onClick={() => setCurrentIndex(i)}
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
