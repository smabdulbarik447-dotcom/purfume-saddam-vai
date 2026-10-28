"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { LIMITS } from "@/lib/dateRange";

// Saamprotik order koyta dekhabe — URL e ?show=50 rakhe (tarikh filter er sathe thake)
export default function RecentLimit({ value }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <label className="recent-limit">
      দেখাও
      <select
        value={value}
        onChange={(e) => {
          const q = new URLSearchParams(params.toString());
          q.set("show", e.target.value);
          router.push(`/admin?${q.toString()}`, { scroll: false });
        }}
      >
        {LIMITS.map((n) => (
          <option key={n} value={n}>{n}টি</option>
        ))}
      </select>
    </label>
  );
}
