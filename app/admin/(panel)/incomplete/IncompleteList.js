"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteIncomplete, convertIncomplete } from "../../actions";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
  });

export default function IncompleteList({ rows }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn) => startTransition(async () => { await fn(); router.refresh(); });

  if (rows.length === 0) return <div className="adm-box"><p className="adm-muted">কোনো অসম্পূর্ণ অর্ডার নেই</p></div>;

  return (
    <div className={`adm-box ${pending ? "busy" : ""}`}>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr><th>সময়</th><th>কাস্টমার</th><th>ঠিকানা</th><th>পণ্য</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.phone}>
                <td><small>{fmtDate(r.updated_at)}</small></td>
                <td>
                  {r.name || "—"}
                  <small>
                    <a href={`tel:${r.phone}`}>📞 {r.phone}</a> · <a href={`https://wa.me/88${r.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
                  </small>
                </td>
                <td>{r.address || "—"}</td>
                <td><small>{r.product}</small></td>
                <td className="adm-actions">
                  <button
                    className="adm-btn sm"
                    onClick={() =>
                      confirm("এটিকে কনফার্মড অর্ডার বানাবেন?") &&
                      run(async () => {
                        const auto = await convertIncomplete(r.phone);
                        if (auto) {
                          alert(auto.error
                            ? `অর্ডার হয়েছে, কিন্তু কুরিয়ারে অটো পাঠানো যায়নি:\n${auto.error}`
                            : `অর্ডার হয়েছে + কুরিয়ারে এন্ট্রি হয়েছে\nট্র্যাকিং: ${auto.tracking}`);
                        }
                      })
                    }
                  >
                    ✓ অর্ডার বানান
                  </button>
                  <button className="adm-btn sm danger" onClick={() => confirm("মুছে ফেলবেন?") && run(() => deleteIncomplete(r.phone))}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
