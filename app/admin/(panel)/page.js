import Link from "next/link";
import { sql, ensureTables, STATUSES, orderCode } from "@/lib/db";
import { getProducts, getSettings, orderDelivery } from "@/lib/store";
import { dhakaDay, money, resolveRange, inRange } from "@/lib/dateRange";
import RangeFilter from "./RangeFilter";
import Icon from "./Icon";
import RecentLimit from "./RecentLimit";
import CountUp from "./CountUp";
import LiveClock from "./LiveClock";
import OrderCalendar from "./OrderCalendar";
import { LIMITS } from "@/lib/dateRange";

const STATUS_COLOR = {
  pending: "#3b82f6", confirmed: "#16a34a", shipped: "#a855f7",
  delivered: "#14b8a6", returned: "#f97316", cancelled: "#ef4444",
};
const DAY = 864e5;
const fmtDate = (d) =>
  new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

export default async function Dashboard({ searchParams }) {
  const sp = await searchParams;
  const rangeId = sp.range || "30d";
  const range = resolveRange(rangeId, sp.from, sp.to);
  // Saamprotik order koyta dekhabe (10/20/50/100/500)
  const show = LIMITS.includes(Number(sp.show)) ? Number(sp.show) : 20;
  await ensureTables();
  const [orders, products, settings, incomplete] = await Promise.all([
    sql`SELECT id, created_at, name, phone, product, area, qty, total, status FROM orders ORDER BY created_at DESC`,
    getProducts({ all: true }),
    getSettings(),
    sql`SELECT phone, name, product, updated_at FROM incomplete_orders ORDER BY updated_at DESC LIMIT 5`,
  ]);

  const inR = orders.filter((o) => inRange(o.created_at, range));
  const sum = (list) => list.reduce((t, o) => t + o.total, 0);
  const isSale = (o) => ["confirmed", "shipped", "delivered"].includes(o.status);
  const customers = (list) => new Set(list.map((o) => o.phone)).size;

  // Ager shoman shomoy er sathe tulona (jemon ৩০ দিন → tar ager ৩০ দিন)
  let prev = null;
  if (range.from) {
    const len = Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY) + 1;
    const pTo = dhakaDay(Date.parse(range.from) - DAY);
    const pFrom = dhakaDay(Date.parse(range.from) - len * DAY);
    prev = orders.filter((o) => inRange(o.created_at, { from: pFrom, to: pTo }));
  }
  const trend = (now, before) => {
    if (prev === null) return null;
    if (!before) return now ? 100 : 0;
    return Math.round(((now - before) / before) * 100);
  };

  const sales = inR.filter(isSale);
  const cards = [
    { icon: "cart", color: "green", label: "মোট অর্ডার", value: inR.length, t: trend(inR.length, prev?.length) },
    { icon: "users", color: "orange", label: "মোট কাস্টমার", value: customers(inR), t: trend(customers(inR), prev && customers(prev)) },
    { icon: "box", color: "purple", label: "কনফার্মড অর্ডার", value: sales.length, t: trend(sales.length, prev?.filter(isSale).length) },
    { icon: "wave", color: "red", label: "মোট বিক্রি (কনফার্মড)", value: money(sum(sales)), t: trend(sum(sales), prev && sum(prev.filter(isSale))) },
  ];
  // Order page er moto: nit profit (shudhu ডেলিভারড, delivery charge bade), batil ar return er taka
  const ofStatus = (list, st) => list.filter((o) => o.status === st);
  const net = (list) => ofStatus(list, "delivered").reduce((t, o) => t + o.total - orderDelivery(settings, products, o), 0);
  cards.push(
    { icon: "chart", color: "lime", label: `নিট প্রফিট (${ofStatus(inR, "delivered").length}টি ডেলিভারড)`, value: money(net(inR)), t: trend(net(inR), prev && net(prev)) },
    { icon: "arrow", color: "rose", label: "বাতিল", value: `${ofStatus(inR, "cancelled").length}টি • ${money(sum(ofStatus(inR, "cancelled")))}`, t: null },
    { icon: "cart", color: "sky", label: "পেন্ডিং (কলের অপেক্ষায়)", value: `${ofStatus(inR, "pending").length}টি • ${money(sum(ofStatus(inR, "pending")))}`, t: null },
    { icon: "box", color: "amber", label: "রিটার্ন", value: `${ofStatus(inR, "returned").length}টি • ${money(sum(ofStatus(inR, "returned")))}`, t: null },
  );

  // Sales Overview: chhoto range e din-protidin, boro/সব সময় e mash-protimash
  let buckets;
  const spanDays = range.from ? Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY) + 1 : 9999;
  // Din-protidin: shesh tarikh theke pichoner ১৫ din (porishkar bojhar jonno shorbochcho ১৫ ta bar)
  const CHART_DAYS = 15;
  if (spanDays <= 31) {
    const end = Date.parse(range.to || dhakaDay(Date.now()));
    buckets = Array.from({ length: CHART_DAYS }, (_, i) => {
      const key = dhakaDay(end - (CHART_DAYS - 1 - i) * DAY);
      const d = new Date(key);
      const list = orders.filter((o) => dhakaDay(o.created_at) === key);
      return {
        key,
        label: String(d.getUTCDate()),
        // Prothom bar ar mash er ১ tarikh e mash er nam
        sub: i === 0 || d.getUTCDate() === 1 ? d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) : "",
        full: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
        list,
      };
    });
  } else {
    const now = new Date(dhakaDay(Date.now()));
    buckets = Array.from({ length: 9 }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (8 - i), 1));
      const key = d.toISOString().slice(0, 7);
      const list = orders.filter((o) => dhakaDay(o.created_at).startsWith(key));
      return { key, label: d.toLocaleDateString("en-GB", { month: "short" }), sub: "", full: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }), list };
    });
  }
  buckets = buckets.map((b) => ({ ...b, sales: sum(b.list.filter(isSale)), count: b.list.length }));
  const maxSales = Math.max(1, ...buckets.map((b) => b.sales));
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  // Order Status donut
  const statusRows = STATUSES.map((s) => ({ ...s, n: inR.filter((o) => o.status === s.id).length, color: STATUS_COLOR[s.id] }));
  let acc = 0;
  const donut = inR.length
    ? `conic-gradient(${statusRows
        .filter((r) => r.n)
        .map((r) => {
          const start = acc;
          acc += (r.n / inR.length) * 100;
          return `${r.color} ${start}% ${acc}%`;
        })
        .join(", ")})`
    : "conic-gradient(#e5e7eb 0 100%)";
  // Ring er protiti rong er majhkhane tar % (khub choto bhag e jayga nei, tai 5% er kom hole lekha hoy na)
  let at = 0;
  const donutLabels = inR.length
    ? statusRows.filter((r) => r.n).map((r) => {
        const pct = (r.n / inR.length) * 100;
        const mid = ((at + pct / 2) / 100) * 2 * Math.PI;
        at += pct;
        return { id: r.id, pct: Math.round(pct), x: 50 + 41.5 * Math.sin(mid), y: 50 - 41.5 * Math.cos(mid) };
      }).filter((l) => l.pct >= 5)
    : [];

  // Top products (beche neya shomoy e কনফার্মড)
  const topMap = {};
  for (const o of sales) topMap[o.product] = (topMap[o.product] || 0) + o.qty;
  const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const stockOf = (name) => products.find((p) => p.name === name);
  const label = Object.fromEntries(STATUSES.map((s) => [s.id, s.label]));
  // Welcome banner: shomoy onujayi shubhechha, ar confirm/delivery er har
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false }));
  const greet = hour < 12 ? "শুভ সকাল" : hour < 17 ? "শুভ দুপুর" : hour < 20 ? "শুভ সন্ধ্যা" : "শুভ রাত্রি";
  const cancelled = inR.filter((o) => o.status === "cancelled").length;
  const confirmRate = sales.length + cancelled ? Math.round((sales.length / (sales.length + cancelled)) * 100) : null;
  const delivered = inR.filter((o) => o.status === "delivered").length;
  const returned = inR.filter((o) => o.status === "returned").length;
  const successRate = delivered + returned ? Math.round((delivered / (delivered + returned)) * 100) : null;
  const pendingNow = orders.filter((o) => o.status === "pending").length;

  // Ajker pulse: aj vs gotokal, ghonta-ghonta order, shesh order kokhon, ajker shera perfume
  const today = dhakaDay(Date.now());
  const yday = dhakaDay(Date.now() - DAY);
  const todayList = orders.filter((o) => dhakaDay(new Date(o.created_at).getTime()) === today);
  const ydayList = orders.filter((o) => dhakaDay(new Date(o.created_at).getTime()) === yday);
  const hourOf = (d) => Number(new Date(d).toLocaleString("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", hour12: false })) % 24;
  const hourly = Array.from({ length: 24 }, (_, h) => todayList.filter((o) => hourOf(o.created_at) === h).length);
  const maxHour = Math.max(1, ...hourly);
  const agoOf = (d) => {
    const min = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 6e4));
    return min < 60 ? `${min} মিনিট আগে` : min < 1440 ? `${Math.round(min / 60)} ঘণ্টা আগে` : `${Math.round(min / 1440)} দিন আগে`;
  };
  const ago = orders[0] ? agoOf(orders[0].created_at) : "—";

  // Calendar: protidin koyta order ar koto confirm bikri
  const calDays = {};
  for (const o of orders) {
    const k = dhakaDay(o.created_at);
    const d = (calDays[k] ||= { n: 0, s: 0 });
    d.n += 1;
    if (isSale(o)) d.s += o.total;
  }

  // Masher lokkho: ei mash er confirm bikri vs goto mash er puro bikri
  const monthKey = today.slice(0, 7);
  const lastMonthKey = dhakaDay(new Date(monthKey + "-01T00:00:00Z").getTime() - DAY).slice(0, 7);
  const monthSales = sum(orders.filter((o) => isSale(o) && dhakaDay(o.created_at).startsWith(monthKey)));
  const lastMonthSales = sum(orders.filter((o) => isSale(o) && dhakaDay(o.created_at).startsWith(lastMonthKey)));
  const dayOfMonth = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate();
  const projected = Math.round((monthSales / dayOfMonth) * daysInMonth);
  const goalPct = lastMonthSales ? Math.round((monthSales / lastMonthSales) * 100) : monthSales ? 100 : 0;
  const todayTop = Object.entries(todayList.reduce((m, o) => ({ ...m, [o.product]: (m[o.product] || 0) + o.qty }), {})).sort((a, b) => b[1] - a[1])[0];
  const diff = todayList.length - ydayList.length;

  const qs = rangeId === "custom" ? `range=custom&from=${sp.from}&to=${sp.to}` : `range=${rangeId}`;

  return (
    <>
      <section className="dash-hero">
        <div className="dash-hero-text">
          <span className="dash-greet">{greet} 👋</span>
          <h1>স্বাগতম, {settings.brand}!</h1>
          <p>
            📅 {range.label} — {inR.length}টি অর্ডার
            {pendingNow > 0 ? <> • <Link href="/admin/orders?status=pending" className="hero-pending">{pendingNow}টি অর্ডার কলের অপেক্ষায়</Link></> : " • সব অর্ডার দেখা হয়েছে ✅"}
          </p>
        </div>
        <LiveClock />
        <span className="mist" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <i key={i} />)}</span>
        <div className="dash-hero-stats">
          <div className="dash-big">
            <small>কনফার্মড বিক্রি</small>
            <b><CountUp value={money(sum(sales))} /></b>
          </div>
          <div className="dash-ring" style={{ "--p": confirmRate ?? 0 }}>
            <b>{confirmRate === null ? "—" : `${confirmRate}%`}</b>
            <small>কনফার্ম রেট</small>
          </div>
          <div className="dash-ring green" style={{ "--p": successRate ?? 0 }}>
            <b>{successRate === null ? "—" : `${successRate}%`}</b>
            <small>ডেলিভারি সফল</small>
          </div>
        </div>
      </section>

      <section className="pulse">
        <div className="pulse-title"><span className="pulse-dot" /> আজকের পালস</div>
        <div className="pulse-item">
          <small>আজ অর্ডার</small>
          <b>{todayList.length}টি</b>
          <em className={diff >= 0 ? "up" : "down"}>{diff >= 0 ? "▲" : "▼"} {Math.abs(diff)} গতকালের চেয়ে</em>
        </div>
        <div className="pulse-item">
          <small>আজ বিক্রি</small>
          <b>{money(sum(todayList.filter(isSale)))}</b>
          <em>মোট {money(sum(todayList))}</em>
        </div>
        <div className="pulse-item">
          <small>শেষ অর্ডার</small>
          <b>{ago}</b>
          <em>{orders[0]?.name || ""}</em>
        </div>
        <div className="pulse-item">
          <small>আজকের সেরা</small>
          <b className="pulse-top">{todayTop ? todayTop[0] : "—"}</b>
          <em>{todayTop ? `${todayTop[1]}টি বিক্রি` : "এখনো অর্ডার নেই"}</em>
        </div>
        <div className="pulse-hours" title="আজ ঘণ্টা অনুযায়ী অর্ডার">
          {hourly.map((n, h) => (
            <span key={h} className={n ? "has" : ""} style={{ height: `${12 + (n / maxHour) * 88}%` }} title={`${h}:00 — ${n}টি`} />
          ))}
          <small>১২AM</small><small>১২PM</small><small>১১PM</small>
        </div>
      </section>

      {orders.length > 0 && (
        <div className="ticker" aria-label="সাম্প্রতিক অর্ডার">
          <span className="ticker-tag">🔔 লাইভ</span>
          <div className="ticker-track">
            <div className="ticker-move">
              {[0, 1].map((k) => orders.slice(0, 10).map((o) => (
                <span key={`${k}-${o.id}`} aria-hidden={k === 1}>
                  🛍️ <b>{o.name}</b> নিয়েছেন {o.product} ×{o.qty} — {money(o.total)} <i>• {agoOf(o.created_at)}</i>
                </span>
              )))}
            </div>
          </div>
        </div>
      )}

      <RangeFilter active={rangeId} from={sp.from} to={sp.to} />

      <section className="kpis">
        {cards.map((c) => (
          <div key={c.label} className="kpi">
            <span className={`kpi-ico k-${c.color}`}><Icon name={c.icon} size={20} /></span>
            <div>
              <small>{c.label}</small>
              <b><CountUp value={c.value} /></b>
              {c.t !== null && (
                <em className={c.t >= 0 ? "up" : "down"}>
                  <Icon name={c.t >= 0 ? "up" : "down"} size={13} /> {Math.abs(c.t)}% <span>আগের সময়ের তুলনায়</span>
                </em>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>বিক্রির চিত্র</h3>
              <small>{spanDays <= 31 ? `শেষ ১৫ দিন (${buckets[0].full} – ${buckets[buckets.length - 1].full})` : "মাস অনুযায়ী"} বিক্রি আর অর্ডার</small>
            </div>
            <div className="legend">
              <span><i /> বিক্রি</span>
              <span><i /> অর্ডার</span>
            </div>
          </div>
          <div className="bars2">
            {buckets.map((b) => (
              <div key={b.key} className={`bars2-col ${b.count ? "has" : ""}`} title={`${b.full}: ${money(b.sales)} বিক্রি • ${b.count}টি অর্ডার`}>
                <div className="bars2-pair">
                  {b.count > 0 && <em className="bars2-val">{b.count}</em>}
                  <span className="g" style={{ height: `${(b.sales / maxSales) * 100}%` }} />
                  <span className="o" style={{ height: `${(b.count / maxCount) * 100}%` }} />
                </div>
                <small>{b.label}</small>
                <small className="bars2-sub">{b.sub}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>অর্ডার স্ট্যাটাস</h3>
              <small>{range.label}</small>
            </div>
          </div>
          <div className="donut-wrap">
            <div className="donut" style={{ background: donut }}>
              <div><b>{inR.length}</b><small>অর্ডার</small></div>
              {donutLabels.map((l) => (
                <span key={l.id} className="donut-pct" style={{ left: `${l.x}%`, top: `${l.y}%` }}>{l.pct}%</span>
              ))}
            </div>
            <ul className="donut-legend">
              {statusRows.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/orders?status=${r.id}&${qs}`}>
                    <i style={{ background: r.color }} /> {r.label}
                    <b>{inR.length ? Math.round((r.n / inR.length) * 100) : 0}%</b>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="panel side-panel">
          <div className="panel-head">
            <div>
              <h3>অসম্পূর্ণ অর্ডার</h3>
              <small className="live-dot">কল করলেই অর্ডার</small>
            </div>
            <Link href="/admin/incomplete" className="view-all">সব <Icon name="arrow" size={13} /></Link>
          </div>
          {incomplete.length === 0 ? (
            <p className="adm-muted empty-note">এখন কোনো অসম্পূর্ণ অর্ডার নেই ✅</p>
          ) : (
            <ul className="mini-list">
              {incomplete.map((r) => (
                <li key={r.phone}>
                  <span className="avatar">{(r.name || "?").trim().slice(0, 1).toUpperCase()}</span>
                  <div>
                    <b>{r.name || "নাম নেই"}</b>
                    <small>{r.phone} • {fmtDate(r.updated_at)}</small>
                  </div>
                  <a href={`tel:${r.phone}`} className="call-btn" aria-label="কল"><Icon name="phone" size={15} /></a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="dash-grid two">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>অর্ডার ক্যালেন্ডার 📅</h3>
              <small>প্রতিদিন কয়টি অর্ডার আর কত বিক্রি — রং যত গাঢ়, অর্ডার তত বেশি</small>
            </div>
          </div>
          <OrderCalendar days={calDays} today={today} />
        </div>

        <div className="panel goal">
          <div className="panel-head">
            <div>
              <h3>এই মাসের লক্ষ্য 🎯</h3>
              <small>গত মাসের বিক্রি ({money(lastMonthSales)}) ছাড়িয়ে যাওয়া</small>
            </div>
          </div>
          <div className="goal-body">
            <div className={`goal-ring ${goalPct >= 100 ? "won" : ""}`} style={{ "--p": Math.min(goalPct, 100) }}>
              <b>{goalPct}%</b>
              <small>{goalPct >= 100 ? "লক্ষ্য পূরণ 🏆" : "পূরণ হয়েছে"}</small>
            </div>
            <ul>
              <li><small>এই মাসে বিক্রি</small><b>{money(monthSales)}</b></li>
              <li><small>দৈনিক গড়</small><b>{money(Math.round(monthSales / dayOfMonth))}</b></li>
              <li><small>মাস শেষে সম্ভাব্য</small><b className="gold">{money(projected)}</b></li>
              <li><small>বাকি দিন</small><b>{daysInMonth - dayOfMonth} দিন</b></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="dash-grid two">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>সাম্প্রতিক অর্ডার</h3>
              <small>সর্বশেষ আগে • {Math.min(show, orders.length)}/{orders.length}টি দেখাচ্ছে — স্ক্রল করে বাকিগুলো দেখুন</small>
            </div>
            <div className="recent-tools">
              <RecentLimit value={show} />
              <Link href="/admin/orders" className="view-all">সব দেখুন <Icon name="arrow" size={13} /></Link>
            </div>
          </div>
          {orders.length === 0 ? (
            <p className="adm-muted empty-note">এখনো কোনো অর্ডার আসেনি</p>
          ) : (
            <div className="adm-table-wrap recent-scroll">
              <table className="adm-table t2">
                <thead>
                  <tr><th>আইডি</th><th>কাস্টমার</th><th>পণ্য</th><th>টাকা</th><th>স্ট্যাটাস</th><th>তারিখ</th></tr>
                </thead>
                <tbody>
                  {orders.slice(0, show).map((o) => (
                    <tr key={o.id}>
                      <td><b>#{orderCode(o.id, settings.brand)}</b></td>
                      <td>{o.name}</td>
                      <td className="t-prod">{o.product} × {o.qty}</td>
                      <td><b>{money(o.total)}</b></td>
                      <td><span className={`chip st-${o.status}`}>{label[o.status] || o.status}</span></td>
                      <td className="t-date">{fmtDate(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>টপ সেলিং পণ্য</h3>
              <small>{range.label} • কনফার্মড</small>
            </div>
            <Link href="/admin/products" className="view-all">সব <Icon name="arrow" size={13} /></Link>
          </div>
          {top.length === 0 ? (
            <p className="adm-muted empty-note">এই সময়ে কনফার্মড বিক্রি নেই</p>
          ) : (
            <ul className="top-list">
              {top.map(([name, qty]) => {
                const p = stockOf(name);
                return (
                  <li key={name}>
                    {p?.image ? <img src={p.image} alt="" /> : <span className="top-ph"><Icon name="box" size={16} /></span>}
                    <div>
                      <b>{name}</b>
                      <small>{money(p?.price || 0)}</small>
                    </div>
                    <span className="top-num"><b>{qty}</b><small>বিক্রি</small></span>
                    <span className={`top-num ${p && p.stock <= 5 ? "low" : ""}`}><b>{p?.stock ?? "—"}</b><small>স্টক</small></span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
