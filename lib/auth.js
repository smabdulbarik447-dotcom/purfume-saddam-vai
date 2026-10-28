import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";

// Password change korle purono shob login automatic batil hoye jay
function token() {
  return createHmac("sha256", process.env.ADMIN_PASSWORD || "").update("admin-session-v1").digest("hex");
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = Buffer.from(String(input));
  const b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function login() {
  (await cookies()).set(COOKIE, token(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  return (await cookies()).get(COOKIE)?.value === token();
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
