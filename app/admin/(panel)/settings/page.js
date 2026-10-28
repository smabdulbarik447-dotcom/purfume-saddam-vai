import { getSettings } from "@/lib/store";
import { saveSettingsAction } from "../../actions";
import SaveForm from "../SaveForm";
import ImageInput from "../ImageInput";
import AudioInput from "../AudioInput";

export default async function SettingsPage() {
  const s = await getSettings();

  return (
    <>
      <h1 className="adm-title">সাইট সেটিংস</h1>

      <div className="adm-box adm-narrow">
        <SaveForm action={saveSettingsAction}>
          <h3>ব্র্যান্ড</h3>
          <div className="adm-row">
            <label>
              ব্র্যান্ডের নাম
              <input name="brand" defaultValue={s.brand} required />
            </label>
            <label>
              ডোমেইন / ট্যাগলাইন
              <input name="domain" defaultValue={s.domain} placeholder="VELOUR.STORE" />
            </label>
          </div>
          <div className="adm-field">
            <span>লোগো <small className="adm-muted">(PNG, স্বচ্ছ ব্যাকগ্রাউন্ড হলে ভালো — সাইটের হেডার, ফুটার, অ্যাডমিন আর ব্রাউজার ট্যাবে দেখাবে)</small></span>
            <ImageInput name="logo" defaultValue={s.logo} folder="logo" />
          </div>
          <div className="adm-field">
            <span>
              ভয়েস <small className="adm-muted">(MP3, ৪ MB পর্যন্ত — কাস্টমার পেজে প্রথম টাচ/ক্লিক করলেই একবার বাজবে, পাশে 🔊/🔇 বাটন থাকবে)</small>
            </span>
            <AudioInput name="voice" defaultValue={s.voice} />
          </div>

          <h3>যোগাযোগ</h3>
          <div className="adm-row">
            <label>
              ফোন নাম্বার
              <input name="phone" defaultValue={s.phone} placeholder="01XXXXXXXXX" />
            </label>
            <label>
              WhatsApp নাম্বার (88 সহ)
              <input name="whatsapp" defaultValue={s.whatsapp} placeholder="8801XXXXXXXXX" />
            </label>
          </div>

          <h3>ডেলিভারি চার্জ (৳)</h3>
          <div className="adm-row">
            <label>
              ঢাকা সিটির ভেতরে
              <input name="delivery_inside" type="number" min="0" defaultValue={s.delivery_inside} />
            </label>
            <label>
              ঢাকা সিটির বাহিরে
              <input name="delivery_outside" type="number" min="0" defaultValue={s.delivery_outside} />
            </label>
          </div>
          <label>
            মোট কত বক্স বা বেশি নিলে ডেলিভারি চার্জ ফ্রি (০ = বন্ধ)
            <input name="free_delivery_boxes" type="number" min="0" defaultValue={s.free_delivery_boxes} />
          </label>
        </SaveForm>
      </div>
    </>
  );
}
