"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetContentAction } from "../../actions";

export default function ResetContent() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="adm-btn ghost"
      disabled={pending}
      onClick={() =>
        confirm("সব লেখা আগের (ডিফল্ট) অবস্থায় ফেরত যাবে। নিশ্চিত?") &&
        startTransition(async () => { await resetContentAction(); router.refresh(); })
      }
    >
      ↺ সব আগের মতো করুন
    </button>
  );
}
