import { useEffect, useRef, useState } from 'react';

export function PhotoViewer({ photos, initialIndex, onClose }) {
  const dialog = useRef(null), stage = useRef(null), pointers = useRef(new Map()), gesture = useRef(null);
  const [index, setIndex] = useState(initialIndex), [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [interacting, setInteracting] = useState(false), [hidden, setHidden] = useState(document.hidden);
  const [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0);
  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const move = delta => { reset(); setIndex(value => (value + delta + photos.length) % photos.length); };
  const changeZoom = value => { const next = Math.max(1, Math.min(3, value)); setZoom(next); setPan({ x: 0, y: 0 }); if (next > 1) setPlaying(false); };
  useEffect(() => { const element = dialog.current, previous = document.activeElement, overflow = document.body.style.overflow; element.showModal(); document.body.style.overflow = 'hidden'; const visibility = () => setHidden(document.hidden); document.addEventListener('visibilitychange', visibility); return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); document.removeEventListener('visibilitychange', visibility); }; }, []);
  useEffect(() => { setFailed(false); setAttempt(0); }, [index]);
  useEffect(() => { if (!playing || zoom > 1 || interacting || hidden || failed || photos.length < 2) return; const timer = setTimeout(() => move(1), 4000); return () => clearTimeout(timer); }, [playing, zoom, interacting, hidden, failed, index, photos.length]);
  function pointerDown(event) {
    stage.current.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY }); setInteracting(true);
    if (pointers.current.size === 1) gesture.current = { x: event.clientX, y: event.clientY, pan, zoom, multiple: false };
    else { const [a, b] = [...pointers.current.values()]; gesture.current = { multiple: true, distance: Math.hypot(a.x - b.x, a.y - b.y), zoom }; setPlaying(false); }
  }
  function pointerMove(event) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const origin = gesture.current; if (!origin) return;
    if (pointers.current.size >= 2) { const [a, b] = [...pointers.current.values()]; setZoom(Math.max(1, Math.min(3, origin.zoom * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, origin.distance)))); setPan({ x: 0, y: 0 }); }
    else if (!origin.multiple && zoom > 1) { const bounds = stage.current.getBoundingClientRect(), maxX = bounds.width * (zoom - 1) / 2, maxY = bounds.height * (zoom - 1) / 2; setPan({ x: Math.max(-maxX, Math.min(maxX, origin.pan.x + event.clientX - origin.x)), y: Math.max(-maxY, Math.min(maxY, origin.pan.y + event.clientY - origin.y)) }); }
  }
  function pointerUp(event) {
    const origin = gesture.current;
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) { setInteracting(false); gesture.current = null; if (event.type !== 'pointercancel' && origin && !origin.multiple && origin.zoom === 1 && zoom === 1) { const dx = event.clientX - origin.x, dy = event.clientY - origin.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1); } }
  }
  const photo = photos[index], source = new URL(photo.url, window.location.origin);
  if (attempt) source.searchParams.set('_tm_retry', String(attempt));
  return <dialog ref={dialog} data-photo-viewer className="photo-viewer" aria-label="Fotografías del profesional" onClose={onClose} onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={event => { if (event.key === 'ArrowRight') { event.preventDefault(); move(1); } if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); } }}>
    <header><div><strong>Trabajos realizados</strong><span aria-live={playing ? 'off' : 'polite'}>Foto {index + 1} de {photos.length}</span></div><button type="button" autoFocus onClick={onClose} aria-label="Cerrar fotografías">✕</button></header>
    <div ref={stage} className={`photo-viewer-stage${zoom > 1 ? ' is-zoomed' : ''}`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onDoubleClick={() => changeZoom(zoom > 1 ? 1 : 2)}>
      {failed ? <div role="status"><p>No pudimos cargar esta foto.</p><button type="button" onClick={() => { setAttempt(Date.now()); setFailed(false); }}>Reintentar</button></div> : <img key={source.href} src={source.href} draggable="false" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} alt={photo.label || `Trabajo realizado ${photo.number}`} onError={() => setFailed(true)} />}
    </div>
    <div className="photo-viewer-controls" aria-label="Controles de fotografía"><button type="button" disabled={zoom <= 1} onClick={() => changeZoom(zoom - .5)} aria-label="Reducir zoom">−</button><button type="button" onClick={reset} aria-label="Restablecer zoom">{Math.round(zoom * 100)}%</button><button type="button" disabled={zoom >= 3 || failed} onClick={() => changeZoom(zoom + .5)} aria-label="Ampliar imagen">+</button>{photos.length > 1 && <button type="button" aria-pressed={playing} onClick={() => { if (!playing) reset(); setPlaying(value => !value); }}>{playing ? 'Pausar' : 'Reproducir'}</button>}</div>
    <p className="photo-viewer-hint">Pellizca para ampliar y arrastra para explorar.</p>
    <footer><button type="button" disabled={photos.length < 2} onClick={() => move(-1)} aria-label="Foto anterior">‹</button><div className="photo-viewer-dots">{photos.map((item, number) => <button key={`${item.url}-${number}`} type="button" aria-label={`Ver foto ${number + 1}`} aria-pressed={number === index} onClick={() => { reset(); setIndex(number); }}><span /></button>)}</div><button type="button" disabled={photos.length < 2} onClick={() => move(1)} aria-label="Foto siguiente">›</button></footer>
  </dialog>;
}
