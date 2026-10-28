import Link from "next/link";
import { sql, ensureTables, STATUSES, orderCode } from "@/lib/db";
import { getSettings, getProducts, orderDelivery } from "@/lib/store";
import { COURIERS, readyCouriers, trackingLink, courierName, courierIcon } from "@/lib/courier";
import { waLink } from "@/lib/whatsapp";
import { resolveRange, inRange } from "@/lib/dateRange";
import { cachedHistory, checkPhoneSafe, bdcKey } from "@/lib/bdcourier";

// Ek bar page khulle shorboccho koyta number BD Courier e check hobe (page dhire na hoy)
const MAX_AUTO_CHECK = 25;
import RangeFilter from "../RangeFilter";
import OrdersTable from "./OrdersTable";

export default async function OrdersPage({ searchParams }) {
  const sp = await searchParams;
  const { status } = sp;
  const rangeId = sp.range || "all";
  const range = resolveRange(rangeId, sp.from, sp.to);
  await ensureTables();
  const [orders, settings, blocked, products] = await Promise.all([
    sql`SELECT * FROM orders ORDER BY created_at DESC LIMIT 5000`,
    getSettings(),
    sql`SELECT kind, value FROM blocked`,
    getProducts({ all: true }),
  ]);

  // Protita phone er ager order er hishab — beshi বাতিল/রিটার্ন mane jhuki
  const history = {};
  for (const o of orders) {
    const h = (history[o.phone] ??= { total: 0, bad: 0, delivered: 0 });
    h.total++;
    if (o.status === "cancelled" || o.status === "returned") h.bad++;
    if (o.status === "delivered") h.delivered++;
  }
  const blockedSet = new Set(blocked.map((b) => `${b.kind}:${b.value}`));
  const shown = orders.filter((o) => inRange(o.created_at, range));
  // BD Courier er shob courier e ager parcel er hishab (cache theke)
  const courierHist = await cachedHistory(shown.map((o) => o.phone));
  // Jei number er hishab nei (purono order / ager check fail), shegulo ekhoni ene ni — click lage na
  if (bdcKey(settings)) {
    const missing = [...new Set(shown.map((o) => o.phone))].filter((p) => !courierHist[p]).slice(0, MAX_AUTO_CHECK);
    const fresh = await Promise.all(missing.map((p) => checkPhoneSafe(p)));
    missing.forEach((p, i) => fresh[i] && (courierHist[p] = fresh[i]));
  }

  return (
    <>
      <div className="adm-title-row">
        <h1 className="adm-title">অর্ডার</h1>
        <Link href="/admin/orders/new" className="adm-btn">📞 নতুন অর্ডার (কল)</Link>
      </div>
      <RangeFilter active={rangeId} from={sp.from} to={sp.to} basePath="/admin/orders" extra={status ? { status } : {}} />
      <OrdersTable
        key={`${status || "all"}-${rangeId}-${sp.from || ""}-${sp.to || ""}`}
        rangeLabel={range.label}
        statuses={STATUSES}
        initialFilter={STATUSES.some((s) => s.id === status) ? status : "all"}
        couriers={readyCouriers(settings).map((id) => COURIERS[id])}
        orders={shown.map((o) => ({
          ...o,
          id: Number(o.id),
          code: orderCode(o.id, settings.brand),
          track: trackingLink(o),
          wa_link: waLink(settings, o),
          courier_name: courierName(o),
          courier_icon: courierIcon(o),
          created_at: new Date(o.created_at).toISOString(),
          history: history[o.phone],
          courierHist: courierHist[o.phone] || null,
          delivery: orderDelivery(settings, products, o),
          blocked: blockedSet.has(`phone:${o.phone}`) || (o.ip && blockedSet.has(`ip:${o.ip}`)),
        }))}
      />
    </>
  );
}
