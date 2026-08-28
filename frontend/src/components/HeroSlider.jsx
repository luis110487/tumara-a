import { useEffect, useRef, useState } from 'react';

const AUTOPLAY_MS = 5000;

export function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (slides.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % slides.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides.length) return null;
  const current = slides[index];

  function goTo(i) {
    setIndex(i);
    clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => setIndex(prev => (prev + 1) % slides.length), AUTOPLAY_MS);
    }
  }

  const image = (
    <img className="tm-hero-photo" src={current.url} alt="Profesionales de limpieza y mantenimiento de TuMaraña.com" />
  );

  return (
    <>
      {current.link ? (
        <a href={current.link} target="_blank" rel="noopener noreferrer">{image}</a>
      ) : image}
      {slides.length > 1 && (
        <div className="tm-hero-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`tm-dot ${i === index ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
