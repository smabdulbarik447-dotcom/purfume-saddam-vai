"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action}>
      <label>
        পাসওয়ার্ড
        <input type="password" name="password" required autoFocus placeholder="Admin password" />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="adm-btn" disabled={pending}>
        {pending ? "অপেক্ষা করুন..." : "লগইন করুন"}
      </button>
    </form>
  );
}
