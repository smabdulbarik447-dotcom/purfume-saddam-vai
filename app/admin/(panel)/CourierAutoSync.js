"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { courierAutoSyncAction } from "../actions";

// Admin khola thakle 5 minute por por courier status ane; kichu bodlale page nijei notun hoy
export default function CourierAutoSync() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const run = () =>
      courierAutoSyncAction()
        .then((n) => alive && n > 0 && router.refresh())
        .catch(() => {});
    run();
    const t = setInterval(run, 5 * 6e4);
    return () => { alive = false; clearInterval(t); };
  }, [router]);
  return null;
}
