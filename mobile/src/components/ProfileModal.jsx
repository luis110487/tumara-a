import { useEffect, useRef } from 'react';

export function ProfileModal({ title, busy, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current, previous = document.activeElement, overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <dialog ref={ref} id="account-panel" className="account-panel account-modal" data-profile-modal data-close-blocked={busy ? 'true' : undefined} aria-labelledby="account-modal-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClose={onClose}>
    <header><h2 id="account-modal-title">{title}</h2><button type="button" autoFocus aria-label="Cerrar panel" disabled={busy} onClick={onClose}>×</button></header>
    <div className="account-modal-body">{children}</div>
  </dialog>;
}
