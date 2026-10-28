import Link from "next/link";
import { RANGES } from "@/lib/dateRange";

// Tarikh filter: আজ / গতকাল / ৭ দিন ... ar nijer moto tarikh (dashboard ar order page)
export default function RangeFilter({ active, from = "", to = "", basePath = "/admin", extra = {} }) {
  const qs = (params) => {
    const q = new URLSearchParams({ ...extra, ...params });
    return `${basePath}?${q.toString()}`;
  };
  return (
    <div className="range-filter">
      <div className="range-tabs">
        {RANGES.map((r) => (
          <Link key={r.id} href={qs({ range: r.id })} className={active === r.id ? "active" : ""}>
            {r.label}
          </Link>
        ))}
      </div>
      <form action={basePath} className="range-custom">
        {Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="range" value="custom" />
        <input type="date" name="from" defaultValue={from} required aria-label="শুরুর তারিখ" />
        <span>থেকে</span>
        <input type="date" name="to" defaultValue={to} required aria-label="শেষ তারিখ" />
        <button className={`adm-btn sm ${active === "custom" ? "" : "ghost"}`}>দেখুন</button>
      </form>
    </div>
  );
}
