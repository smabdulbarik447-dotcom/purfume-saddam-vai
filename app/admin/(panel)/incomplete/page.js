import { sql, ensureTables } from "@/lib/db";
import IncompleteList from "./IncompleteList";

export default async function IncompletePage() {
  await ensureTables();
  const rows = await sql`SELECT * FROM incomplete_orders ORDER BY updated_at DESC LIMIT 1000`;

  return (
    <>
      <h1 className="adm-title">অসম্পূর্ণ অর্ডার</h1>
      <p className="adm-muted adm-intro">
        যারা ফর্মে মোবাইল নাম্বার লিখেছে কিন্তু অর্ডার কনফার্ম করেনি — এদের কল করলে অনেক অর্ডার ফেরত আসে।
        অর্ডার করে ফেললে এখান থেকে নিজে থেকেই মুছে যায়।
      </p>
      <IncompleteList rows={rows.map((r) => ({ ...r, updated_at: new Date(r.updated_at).toISOString() }))} />
    </>
  );
}
