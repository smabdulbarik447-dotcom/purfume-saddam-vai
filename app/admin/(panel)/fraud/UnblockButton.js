"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { unblock } from "../../actions";

export default function UnblockButton({ kind, value }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="adm-btn sm ghost"
      disabled={pending}
      onClick={() =>
        confirm(`${value} আনব্লক করবেন?`) &&
        startTransition(async () => { await unblock(kind, value); router.refresh(); })
      }
    >
      আনব্লক
    </button>
  );
}
