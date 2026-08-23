// Local-timezone date helpers.
// All app dates are "YYYY-MM-DD" strings in the user's local time.
// Never use toISOString() for dates — it converts to UTC and shifts the day near midnight.

export const formatDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayStr = (): string => formatDate(new Date());

// Parse "YYYY-MM-DD" as local midnight (new Date("YYYY-MM-DD") would parse as UTC).
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getStartOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const addDays = (dateStr: string, days: number): string => {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return formatDate(new Date(y, m - 1, d + days));
};

export const displayDate = (dateStr: string, opts?: Intl.DateTimeFormatOptions): string =>
  parseLocalDate(dateStr).toLocaleDateString(undefined, opts ?? { month: 'short', day: 'numeric' });
