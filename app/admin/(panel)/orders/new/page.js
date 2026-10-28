import Link from "next/link";
import { getProducts, getSettings, deliveryOptions } from "@/lib/store";
import { COURIERS, autoCourierFor } from "@/lib/courier";
import ManualOrderForm from "./ManualOrderForm";

export default async function NewOrderPage() {
  const [products, s] = await Promise.all([getProducts({ all: true }), getSettings()]);
  const auto = autoCourierFor(s);

  return (
    <>
      <div className="adm-title-row">
        <h1 className="adm-title">নতুন অর্ডার (ম্যানুয়াল)</h1>
        <Link href="/admin/orders" className="adm-btn ghost">← সব অর্ডার</Link>
      </div>
      <p className="adm-muted adm-intro">
        কাস্টমার ফোনে বা মেসেজে অর্ডার দিলে এখান থেকে বসান। অর্ডারটা ল্যান্ডিং পেজের অর্ডারের মতোই অর্ডার লিস্ট আর Telegram এ যাবে।
        {auto
          ? ` “কনফার্মড” হিসেবে দিলে সাথে সাথে ${COURIERS[auto].name} এ এন্ট্রি হয়ে যাবে।`
          : " কুরিয়ার অটো এন্ট্রি এখন বন্ধ/সেট করা নেই — পরে অর্ডার পেজ থেকে পাঠাতে পারবেন।"}
      </p>
      <div className="adm-box adm-narrow">
        <ManualOrderForm
          products={products.map(({ id, name, price, boxes, active, stock }) => ({ id, name, price, boxes, active, stock }))}
          delivery={deliveryOptions(s)}
          freeBoxes={Number(s.free_delivery_boxes) || 0}
        />
      </div>
    </>
  );
}
