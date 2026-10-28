import "../admin.css";
import "../admin-theme.css";
import "../admin-colorful.css";
import "../admin-motion.css";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import { sql, ensureTables } from "@/lib/db";
import { logoutAction } from "../actions";
import Sidebar from "./Sidebar";
import Icon from "./Icon";
import HoverFX from "./HoverFX";
import CourierAutoSync from "./CourierAutoSync";

export const metadata = { title: "Admin Panel", robots: { index: false } };

export default async function PanelLayout({ children }) {
  await requireAdmin();
  await ensureTables();
  const [s, [counts]] = await Promise.all([
    getSettings(),
    sql`SELECT (SELECT count(*)::int FROM orders WHERE status = 'pending') AS pending,
               (SELECT count(*)::int FROM incomplete_orders) AS incomplete`,
  ]);
  const [first, ...rest] = s.brand.split(" ");

  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-logo">
          {s.logo ? <img src={s.logo} alt={s.brand} className="adm-logo-img" /> : <b><span>{first}</span> {rest.join(" ")}</b>}
          <small>অ্যাডমিন প্যানেল</small>
        </div>
        <Sidebar badges={counts} />
        <div className="side-promo">
          <span className="side-promo-ico"><Icon name="phone" size={22} /></span>
          <b>ফোনে অর্ডার এসেছে?</b>
          <small>কলে পাওয়া অর্ডার এখান থেকে বসান</small>
          <Link href="/admin/orders/new" className="side-promo-btn">নতুন অর্ডার <Icon name="arrow" size={15} /></Link>
        </div>
        <div className="adm-side-foot">
          <a href="/" target="_blank"><Icon name="globe" size={16} /> সাইট দেখুন</a>
          <form action={logoutAction}>
            <button><Icon name="logout" size={16} /> লগআউট</button>
          </form>
        </div>
      </aside>
      <main className="adm-main">{children}</main>
      <HoverFX />
      <CourierAutoSync />
    </div>
  );
}
