const TZ = 'America/Bogota';

export const formatFecha = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-CO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatFechaHora = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-CO', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
