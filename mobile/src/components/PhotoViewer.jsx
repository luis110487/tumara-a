import { useEffect, useRef, useState } from 'react';

export function PhotoViewer({ photos, initialIndex, onClose }) {
  const dialog = useRef(null), start = useRef(null);
  const [index, setIndex] = useState(initialIndex);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const move = delta => setIndex(value => Math.max(0, Math.min(photos.length - 1, value + delta)));
  useEffect(() => { const element = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow; element.showModal(); document.body.style.overflow = 'hidden'; return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); }; }, []);
  useEffect(() => { setFailed(false); setAttempt(0); }, [index]);
  const photo = photos[index];
  const source = new URL(photo.url, window.location.origin);
  if (attempt) source.searchParams.set('_tm_retry', String(attempt));
  return <dialog ref={dialog} data-photo-viewer className="photo-viewer" aria-label="Fotografías del profesional" onClose={onClose} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}>
    <header><span aria-live="polite">Foto {index + 1} de {photos.length}</span><button type="button" autoFocus onClick={onClose} aria-label="Cerrar fotografías">✕</button></header>
    <div className="photo-viewer-stage" onTouchStart={event => { const touch = event.touches[0]; start.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const touch = event.changedTouches[0], origin = start.current; start.current = null; if (!origin) return; const dx = touch.clientX - origin.x, dy = touch.clientY - origin.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1); }}>
      {failed ? <div role="status"><p>No pudimos cargar esta foto.</p><button type="button" onClick={() => { setAttempt(Date.now()); setFailed(false); }}>Reintentar</button></div> : <img key={source.href} src={source.href} alt={photo.label || `Trabajo realizado ${photo.number}`} onError={() => setFailed(true)} />}
    </div>
    <footer><button type="button" disabled={index === 0} onClick={() => move(-1)} aria-label="Foto anterior">‹ Anterior</button><button type="button" disabled={index === photos.length - 1} onClick={() => move(1)} aria-label="Foto siguiente">Siguiente ›</button></footer>
  </dialog>;
}
