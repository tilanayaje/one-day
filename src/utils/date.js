function toLocalISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return toLocalISO(d);
}

export function getLastWeekKey() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() - 7);
  return toLocalISO(d);
}