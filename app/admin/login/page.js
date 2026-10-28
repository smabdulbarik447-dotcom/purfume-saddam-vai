import "../admin.css";
import "../admin-theme.css";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/store";
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin Login", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const s = await getSettings();
  const [first, ...rest] = s.brand.split(" ");
  return (
    <main className="adm-login">
      <div className="login-card">
        <div className="adm-logo">
          {s.logo ? <img src={s.logo} alt={s.brand} className="adm-logo-img" /> : <b><span>{first}</span> {rest.join(" ")}</b>}
          <small>অ্যাডমিন প্যানেল</small>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
