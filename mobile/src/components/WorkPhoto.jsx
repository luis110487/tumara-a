import { useState } from 'react';

export function WorkPhoto({ url, number }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  let source = url;
  if (attempt) {
    const retry = new URL(url, window.location.origin);
    retry.searchParams.set('_tm_retry', String(attempt));
    source = retry.href;
  }
  return <div className="pro-work-photo">{failed ? <div className="pro-work-photo-error" role="status"><span>No pudimos cargar esta foto.</span><button type="button" onClick={() => { setAttempt(Date.now()); setFailed(false); }}>Reintentar foto {number}</button></div> : <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto de trabajo ${number}`}><img src={source} loading="lazy" alt={`Trabajo realizado ${number}`} onError={() => setFailed(true)} /></a>}</div>;
}
