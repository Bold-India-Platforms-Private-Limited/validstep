// Standard Indian public holidays — static, no backend needed (mirrors the old workspace
// app's holiday calendar, which was informational only).
export const HOLIDAYS_2026 = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-04", name: "Holi" },
  { date: "2026-03-20", name: "Eid al-Fitr" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-05-01", name: "Labour Day" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-08-26", name: "Raksha Bandhan" },
  { date: "2026-09-04", name: "Ganesh Chaturthi" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-10-20", name: "Dussehra" },
  { date: "2026-11-08", name: "Diwali" },
  { date: "2026-12-25", name: "Christmas Day" },
];

export function holidayOn(dateKey) {
  return HOLIDAYS_2026.find((h) => h.date === dateKey);
}
