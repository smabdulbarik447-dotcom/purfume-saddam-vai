"use client";

import { useActionState } from "react";

// Settings / Product form er common wrapper: save button + "সেভ হয়েছে" message
export default function SaveForm({ action, children, button = "সেভ করুন" }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="adm-form">
      {children}
      <div className="adm-form-foot">
        <button className="adm-btn" disabled={pending}>{pending ? "সেভ হচ্ছে..." : button}</button>
        {state?.ok && !pending && <span className="adm-ok">✓ সেভ হয়েছে</span>}
        {state?.error && <span className="adm-err">{state.error}</span>}
      </div>
    </form>
  );
}
