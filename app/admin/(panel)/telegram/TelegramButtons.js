"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendTestMessage, disconnectChat } from "../../actions";

export function TestButton() {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <div className="adm-form-foot">
      <button
        className="adm-btn ghost"
        disabled={pending}
        onClick={() => startTransition(async () => { await sendTestMessage(); setSent(true); })}
      >
        {pending ? "পাঠানো হচ্ছে..." : "📨 টেস্ট মেসেজ পাঠান"}
      </button>
      {sent && <span className="adm-ok">✓ পাঠানো হয়েছে, Telegram দেখুন</span>}
    </div>
  );
}

export function DisconnectButton({ chatId, name }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="adm-btn sm danger"
      disabled={pending}
      onClick={() =>
        confirm(`${name} ডিসকানেক্ট করবেন?`) &&
        startTransition(async () => { await disconnectChat(chatId); router.refresh(); })
      }
    >
      ডিসকানেক্ট
    </button>
  );
}
