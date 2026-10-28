import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";
import { ensureTables } from "@/lib/db";
import { webhookKey, findOrderFromWebhook, syncOneOrder } from "@/lib/courierSync";

// Webhook jog korar shomoy courier ei header gulo ferot chay — na dile "Validation error" dey
const INTEGRATION_HEADERS = {
  // Pathao (Pathao er documentation onujayi)
  "X-Pathao-Merchant-Webhook-Integration-Secret": "f3992ecc-59da-4cbe-a049-a13da2018d51",
  // CarryBee (CarryBee panel er validation error e deya man)
  "X-CB-Webhook-Integration-Header": "40489fe0-9386-4fc9-8e92-2b2fcb9d451c",
};

const reply = (body, status = 202) => Response.json(body, { status, headers: INTEGRATION_HEADERS });

/**
 * Steadfast / Pathao / CarryBee er webhook: status bodlale courier ekhane jananay.
 * Body te ja ashe sheta bishshash kori na — shudhu order khuje courier er API theke status abar check kori.
 */
export async function POST(req, { params }) {
  const { key } = await params;
  const want = Buffer.from(webhookKey());
  const got = Buffer.from(String(key));
  if (got.length !== want.length || !timingSafeEqual(got, want)) return new Response("forbidden", { status: 403 });

  const text = await req.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = Object.fromEntries(new URLSearchParams(text));
  }

  try {
    await ensureTables();
    const orderId = await findOrderFromWebhook(body);
    if (!orderId) return reply({ ok: true, matched: false });
    const res = await syncOneOrder(orderId);
    if (res.changed.length) revalidatePath("/admin", "layout");
    return reply({ ok: true, matched: true, changed: res.changed.length });
  } catch (err) {
    console.error("Courier webhook failed", err);
    return reply({ ok: false }, 200);
  }
}

// Kichu courier URL check korte GET pathay
export async function GET() {
  return reply({ ok: true }, 200);
}
