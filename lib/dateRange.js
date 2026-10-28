// Tarikh filter (Bangladesh shomoy) — dashboard ar order page duijaygay use hoy, server/browser duitatei chole
export const dhakaDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

const shift = (days) => dhakaDay(Date.now() + days * 864e5);

export const RANGES = [
  { id: "today", label: "আজ" },
  { id: "yesterday", label: "গতকাল" },
  { id: "7d", label: "৭ দিন" },
  { id: "30d", label: "৩০ দিন" },
  { id: "month", label: "এই মাস" },
  { id: "lastmonth", label: "গত মাস" },
  { id: "all", label: "সব সময়" },
];

/** range id (ba custom from/to) theke { from, to, label } — "YYYY-MM-DD" string, dui dik inclusive */
export function resolveRange(range, from, to) {
  const today = shift(0);
  const [y, m] = today.split("-").map(Number);
  const pad = (n) => String(n).padStart(2, "0");
  switch (range) {
    case "today": return { from: today, to: today, label: "আজ" };
    case "yesterday": return { from: shift(-1), to: shift(-1), label: "গতকাল" };
    case "7d": return { from: shift(-6), to: today, label: "শেষ ৭ দিন" };
    case "30d": return { from: shift(-29), to: today, label: "শেষ ৩০ দিন" };
    case "month": return { from: `${y}-${pad(m)}-01`, to: today, label: "এই মাস" };
    case "lastmonth": {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      const last = new Date(Date.UTC(ly, lm, 0)).getUTCDate();
      return { from: `${ly}-${pad(lm)}-01`, to: `${ly}-${pad(lm)}-${last}`, label: "গত মাস" };
    }
    case "custom":
      if (/^\d{4}-\d{2}-\d{2}$/.test(from || "") && /^\d{4}-\d{2}-\d{2}$/.test(to || "")) {
        const [a, b] = from <= to ? [from, to] : [to, from];
        return { from: a, to: b, label: `${a} থেকে ${b}` };
      }
      return { from: null, to: null, label: "সব সময়" };
    default:
      return { from: null, to: null, label: "সব সময়" };
  }
}

export const inRange = (createdAt, r) => {
  if (!r.from) return true;
  const d = dhakaDay(createdAt);
  return d >= r.from && d <= r.to;
};

export const money = (n) => `৳${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

// Dashboard e saamprotik order koyta dekhabe (server ar browser duijaygay lage, tai ekhane)
export const LIMITS = [10, 20, 50, 100, 500];
