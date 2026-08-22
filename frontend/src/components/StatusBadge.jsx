const LABELS = {
  requested: 'Solicitada',
  in_conversation: 'En conversación',
  quoted: 'Cotizada',
  accepted: 'Aceptada',
  in_progress: 'En progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const CLASSES = {
  requested: 'tm-status-pending',
  in_conversation: 'tm-status-pending',
  quoted: 'tm-status-pending',
  accepted: 'tm-status-active',
  in_progress: 'tm-status-active',
  completed: 'tm-status-done',
  cancelled: 'tm-status-cancelled',
};

export function StatusBadge({ status }) {
  return <span className={`status-pill ${CLASSES[status] || ''}`}>● {LABELS[status] || status}</span>;
}

export const STATUS_OPTIONS = Object.entries(LABELS);
