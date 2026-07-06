// Форматирование даты / времени для карточек истории

function pad(n) {
  return String(n).padStart(2, "0");
}

// DD.MM.YYYY
export function formatDate(d) {
  const date = new Date(d);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

// HH:MM:SS
function formatTime(d) {
  const date = new Date(d);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

//если начало и конец в один день, то одна дата; если переходит, то через тире
export function dateLabel(start, end) {
  if (!start) return "—";
  const s = formatDate(start);
  if (!end) return s;
  const e = formatDate(end);
  return s === e ? s : `${s} – ${e}`;
}

//HH:MM:SS – HH:MM:SS
export function timeLabel(start, end) {
  if (!start) return "—";
  const s = formatTime(start);
  if (!end) return s;
  return `${s} – ${formatTime(end)}`;
}
