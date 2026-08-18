// Local calendar-day key (YYYY-MM-DD) using the browser's local Y/M/D — NOT
// Date#toISOString(), which converts to UTC first and silently shifts the date backward
// for any positive UTC offset (e.g. IST, UTC+5:30) whenever local time is past midnight
// but UTC time is still on the previous day.
export function localDateKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
