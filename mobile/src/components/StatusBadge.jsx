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

export function StatusBadge({ status, labels = LABELS, classes = CLASSES }) {
  return <span className={`status-pill ${classes[status] || ''}`}>● {labels[status] || status}</span>;
}

export const STATUS_OPTIONS = Object.entries(LABELS);

export const PROFESSIONAL_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  suspended: 'Suspendido',
};

export const PROFESSIONAL_STATUS_CLASSES = {
  pending: 'tm-status-pending',
  approved: 'tm-status-active',
  rejected: 'tm-status-cancelled',
  suspended: 'tm-status-cancelled',
};
