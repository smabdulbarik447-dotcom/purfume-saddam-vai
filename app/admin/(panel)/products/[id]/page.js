import Link from "next/link";
import { notFound } from "next/navigation";
import { getProducts } from "@/lib/store";
import { saveProduct } from "../../../actions";
import SaveForm from "../../SaveForm";
import ImageInput from "../../ImageInput";

// "/admin/products/new" = notun, "/admin/products/12" = edit
export default async function ProductEdit({ params }) {
  const { id } = await params;
  const isNew = id === "new";
  const p = isNew
    ? { id: "", name: "", price: "", old_price: "", stock: 100, image: "/images/combo.png", sort: 0, active: true, boxes: 1 }
    : (await getProducts({ all: true })).find((x) => x.id === Number(id));
  if (!p) notFound();

  return (
    <>
      <div className="adm-title-row">
        <h1 className="adm-title">{isNew ? "নতুন পণ্য" : "পণ্য এডিট"}</h1>
        <Link href="/admin/products" className="adm-btn ghost">← সব পণ্য</Link>
      </div>

      <div className="adm-box adm-narrow">
        <SaveForm action={saveProduct} button={isNew ? "পণ্য যোগ করুন" : "আপডেট করুন"}>
          <input type="hidden" name="id" value={p.id} />
          <label>
            পণ্যের নাম *
            <input name="name" defaultValue={p.name} required placeholder="যেমন: প্রিমিয়াম ৪ ইন ১ কম্বো+৬ মিলি আতর" />
          </label>
          <div className="adm-row">
            <label>
              দাম (৳) *
              <input name="price" type="number" min="1" defaultValue={p.price} required />
            </label>
            <label>
              আগের দাম (কাটা দাম)
              <input name="old_price" type="number" min="0" defaultValue={p.old_price} />
            </label>
          </div>
          <div className="adm-row">
            <label>
              স্টক
              <input name="stock" type="number" min="0" defaultValue={p.stock} />
            </label>
            <label>
              ক্রম (ছোট সংখ্যা আগে দেখাবে)
              <input name="sort" type="number" defaultValue={p.sort} />
            </label>
          </div>
          <label>
            এই প্যাকেজে কয়টি বক্স (ফ্রি ডেলিভারি হিসাবের জন্য — “2 box” প্যাকেজ হলে ২)
            <input name="boxes" type="number" min="1" defaultValue={p.boxes || 1} />
          </label>
          <div className="adm-field">
            <span>পণ্যের ছবি</span>
            <ImageInput name="image" defaultValue={p.image} folder="products" />
          </div>
          <label className="adm-check">
            <input type="checkbox" name="active" defaultChecked={p.active} /> সক্রিয় (ল্যান্ডিং পেজে দেখাবে)
          </label>
        </SaveForm>
      </div>
    </>
  );
}
