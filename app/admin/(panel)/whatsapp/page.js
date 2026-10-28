import { getSettings } from "@/lib/store";
import { waReady, confirmText } from "@/lib/whatsapp";
import { saveSettingsAction } from "../../actions";
import SaveForm from "../SaveForm";

export default async function WhatsAppPage() {
  const s = await getSettings();
  const sample = confirmText(s, { name: "রহিম", product: "প্রিমিয়াম ৪ ইন ১ কম্বো+৬ মিলি আতর", qty: 1, total: 1069 });
  const ready = waReady(s);

  return (
    <>
      <h1 className="adm-title">WhatsApp কনফার্ম মেসেজ</h1>

      <div className="adm-box adm-narrow">
        <h3>💬 মেসেজের লেখা</h3>
        <p className="adm-muted adm-intro-sm">
          অর্ডার পেজে প্রতিটি কনফার্মড অর্ডারে <b>“💬 কনফার্ম মেসেজ”</b> বাটন আছে — চাপলে কাস্টমারের WhatsApp এ এই লেখাটা লেখা অবস্থায় খুলবে,
          আপনি শুধু Send চাপবেন। <code>{"{name}"}</code> = কাস্টমারের নাম, <code>{"{product}"}</code> = পণ্য,
          <code>{"{total}"}</code> = মোট টাকা, <code>{"{brand}"}</code> = আপনার ব্র্যান্ড।
        </p>
        <SaveForm action={saveSettingsAction}>
          <label>
            মেসেজ
            <textarea name="wa_message" rows={4} defaultValue={s.wa_message} />
          </label>
        </SaveForm>
        <div className="wa-preview">
          <small>দেখতে এমন হবে:</small>
          <p>{sample}</p>
        </div>
      </div>

      <div className="adm-box adm-narrow">
        <h3>
          ⚡ অটোমেটিক পাঠানো (WhatsApp Cloud API){" "}
          {ready ? <span className="pill st-delivered">✓ চালু</span> : <span className="pill st-pending">বন্ধ</span>}
        </h3>
        <p className="adm-muted adm-intro-sm">
          চালু করলে অর্ডার <b>কনফার্ম</b> করার সাথে সাথে (অ্যাডমিন, Telegram, কলের অর্ডার — সব জায়গা থেকে) কাস্টমারের WhatsApp এ নিজে থেকে মেসেজ যাবে।
          কাস্টমারের WhatsApp না থাকলে কিছু হবে না। এক অর্ডারে একবারই যায়।
        </p>
        {s.wa_last_error && <p className="adm-err">শেষ সমস্যা: {s.wa_last_error}</p>}
        <SaveForm action={saveSettingsAction}>
          <label>
            অটো মেসেজ
            <select name="wa_auto" defaultValue={s.wa_auto}>
              <option value="off">বন্ধ — শুধু বাটন চেপে পাঠাবো</option>
              <option value="on">চালু — কনফার্ম করলেই নিজে থেকে যাবে</option>
            </select>
          </label>
          <div className="adm-row">
            <label>
              Phone number ID
              <input name="wa_phone_id" defaultValue={s.wa_phone_id} placeholder="যেমন: 1234567890123456" autoComplete="off" />
            </label>
            <label>
              Access Token
              <input
                name="wa_token"
                type="password"
                autoComplete="new-password"
                placeholder={s.wa_token ? "•••••••• (সেভ করা আছে)" : "EAAG... (permanent token)"}
              />
            </label>
          </div>
          <div className="adm-row">
            <label>
              Template এর নাম
              <input name="wa_template" defaultValue={s.wa_template} placeholder="order_confirmed" />
            </label>
            <label>
              Template এর ভাষা কোড
              <input name="wa_lang" defaultValue={s.wa_lang} placeholder="bn" />
            </label>
          </div>
        </SaveForm>

        <h3 className="mt">একবার সেটআপ (Meta তে)</h3>
        <ol className="capi-steps">
          <li><b>business.facebook.com</b> → WhatsApp Manager → একটা <b>WhatsApp Business নাম্বার</b> যোগ করুন (এই নাম্বার থেকে মেসেজ যাবে — সাধারণ WhatsApp এ চালু থাকা নাম্বার দেওয়া যায় না)</li>
          <li>
            <b>Message templates → Create</b> → Category: <b>Utility</b>, নাম: <code>order_confirmed</code>, ভাষা: <b>Bengali</b> → Body তে লিখুন:
            <code className="webhook-url">হাই {"{{1}}"}! {"{{4}}"} থেকে বলছি। আপনার অর্ডার ({"{{2}}"}) কনফার্ম হয়েছে। মোট দাম {"{{3}}"} টাকা। ধন্যবাদ!</code>
            ({"{{1}}"} নাম, {"{{2}}"} পণ্য, {"{{3}}"} টাকা, {"{{4}}"} ব্র্যান্ড) → Submit করে Approve হওয়া পর্যন্ত অপেক্ষা করুন
          </li>
          <li>WhatsApp → <b>API Setup</b> থেকে <b>Phone number ID</b> কপি করুন, আর System User থেকে <b>permanent access token</b> বানিয়ে উপরে দিন</li>
          <li>উপরে “অটো মেসেজ” <b>চালু</b> করে সেভ করুন</li>
        </ol>
      </div>
    </>
  );
}
