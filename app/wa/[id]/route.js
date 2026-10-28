import { sql, ensureTables } from "@/lib/db";
import { getSettings } from "@/lib/store";
import { waLink, waConfirmKey } from "@/lib/whatsapp";

// Telegram er "কনফার্ম মেসেজ" button — lekha shoho wa.me link onek lomba, tai ekhane theke redirect
export async function GET(req, { params }) {
  const { id } = await params;
  const key = new URL(req.url).searchParams.get("k") || "";
  if (!/^\d+$/.test(id) || key !== waConfirmKey(id)) return new Response("Invalid link", { status: 403 });

  await ensureTables();
  const [o] = await sql`SELECT name, phone, product, qty, total FROM orders WHERE id = ${id}`;
  if (!o) return new Response("অর্ডারটি পাওয়া যায়নি", { status: 404 });
  return new Response(null, {
    status: 302,
    headers: { Location: waLink(await getSettings(), o), "Cache-Control": "no-store" },
  });
}
