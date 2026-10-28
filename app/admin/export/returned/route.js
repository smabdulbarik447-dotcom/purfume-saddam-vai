import { sql, ensureTables } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

// Meta Ads "Customer list" audience er CSV: রিটার্ন kora ar ফেক (block kora) customer der number.
// Ads e eta Exclude korle oder kache ad jabe na.
export async function GET() {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  await ensureTables();
  const rows = await sql`
    SELECT DISTINCT ON (phone) phone, name FROM (
      SELECT phone, name FROM orders WHERE status = 'returned'
      UNION ALL
      SELECT o.phone, o.name FROM blocked b JOIN orders o ON o.phone = b.value WHERE b.kind = 'phone'
      UNION ALL
      SELECT value AS phone, '' AS name FROM blocked WHERE kind = 'phone'
    ) x
    ORDER BY phone, name DESC`;

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows
    .filter((r) => /^01\d{9}$/.test(r.phone))
    .map((r) => [esc("+88" + r.phone), esc(String(r.name || "").trim().split(/\s+/)[0] || ""), esc("BD")].join(","));
  const csv = ["phone,fn,country", ...lines].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="returned-customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
