"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendConfirmedToCourier, syncCouriersAction } from "../../actions";

export function BulkSendButton({ waiting, courier, name, disabled }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="courier-btn">
      <button
        className="adm-btn"
        disabled={disabled || pending || waiting === 0}
        onClick={() =>
          confirm(`${waiting}টি কনফার্মড অর্ডার ${name} এ পাঠাবেন?`) &&
          startTransition(async () => {
            const r = await sendConfirmedToCourier(courier);
            setMsg(`✓ ${r.sent}/${r.total}টি পাঠানো হয়েছে${r.errors.length ? ` — সমস্যা: ${r.errors.join("; ")}` : ""}`);
            router.refresh();
          })
        }
      >
        {pending ? "পাঠানো হচ্ছে..." : `🚚 সব কনফার্মড অর্ডার ${name} এ পাঠান (${waiting})`}
      </button>
      {msg && <small className={msg.includes("সমস্যা") ? "adm-err" : "adm-ok"}>{msg}</small>}
    </div>
  );
}

export function SyncButton({ onWay, disabled }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="courier-btn">
      <button
        className="adm-btn ghost"
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            const r = await syncCouriersAction();
            setMsg(`✓ ${r.checked}টি চেক হয়েছে, ${r.changed.length}টির স্ট্যাটাস বদলেছে`);
            router.refresh();
          })
        }
      >
        {pending ? "চেক হচ্ছে..." : `🔄 এখনই কুরিয়ার স্ট্যাটাস আপডেট করুন (${onWay}টি পথে)`}
      </button>
      {msg && <small className="adm-ok">{msg}</small>}
    </div>
  );
}
