import { getSettings, pixelIds } from "@/lib/store";
import { capiTokens } from "@/lib/fbcapi";
import { saveSettingsAction } from "../../actions";
import SaveForm from "../SaveForm";

export default async function TrackingPage() {
  const s = await getSettings();
  const ids = pixelIds(s.fb_pixel);
  const tokens = capiTokens(s);
  const withToken = ids.filter((id) => tokens[id]);

  return (
    <>
      <h1 className="adm-title">ট্র্যাকিং কোড (Pixel/GTM)</h1>
      <p className="adm-muted adm-intro">
        শুধু আইডি দিন, পুরো কোড লাগবে না। ভিজিটরের ব্রাউজার থেকে PageView, ViewContent আর InitiateCheckout যায়।
        <b> Purchase অর্ডার আসার সাথে সাথে যায় না</b> — নিচের Conversions API সেট করলে আপনি অর্ডার কনফার্ম করলে তবেই যায়।
      </p>

      <div className="adm-box adm-narrow">
        <SaveForm action={saveSettingsAction}>
          <label>
            Facebook Pixel ID <small className="adm-muted">(একাধিক হলে প্রতি লাইনে একটা — সর্বোচ্চ ১০টা)</small>
            <textarea name="fb_pixel" rows={4} defaultValue={s.fb_pixel} placeholder={"1234567890123456\n9876543210987654"} />
          </label>
          {ids.length > 0 && (
            <div className="pixel-list">
              <span>চালু Pixel ({ids.length}টা):</span>
              {ids.map((id) => (
                <code key={id}>{id}</code>
              ))}
            </div>
          )}
          <label>
            Google Tag Manager ID
            <input name="gtm_id" defaultValue={s.gtm_id} pattern="[Gg][Tt][Mm]-[A-Za-z0-9]{4,12}" placeholder="যেমন: GTM-ABC1234" />
          </label>
        </SaveForm>
      </div>

      <div className="adm-box adm-narrow">
        <h3>
          🎯 Conversions API — কনফার্ম করলে Purchase{" "}
          {withToken.length ? (
            <span className="pill st-delivered">✓ চালু ({withToken.length}/{ids.length} Pixel)</span>
          ) : (
            <span className="pill st-pending">সেট করা নেই</span>
          )}
        </h3>
        <ul className="fraud-always capi-rules">
          <li>🛒 নতুন অর্ডার → Facebook এ <b>কিছু যায় না</b> (হোল্ড)</li>
          <li>✅ আপনি <b>কনফার্ম</b> করলে (বা শিপড/ডেলিভারড) → <b>Purchase</b> যায়, টাকার পরিমাণসহ — একটা অর্ডারে একবারই</li>
          <li>❌ <b>বাতিল</b> করলে → কিছুই যায় না</li>
          <li>↩️ <b>রিটার্ন</b> করলে (নিজে বা কুরিয়ার থেকে) → <b>OrderReturned</b> ইভেন্ট যায় — এটা দিয়ে ওই কাস্টমারদের Ads থেকে বাদ দেবেন</li>
        </ul>

        {ids.length === 0 ? (
          <p className="adm-err">আগে উপরে Pixel ID দিন।</p>
        ) : (
          <SaveForm action={saveSettingsAction}>
            <p className="adm-muted adm-intro-sm">
              প্রতিটি Pixel এর টোকেন: <b>Events Manager → Pixel → Settings → Conversions API → Generate access token</b>।
            </p>
            {ids.map((id) => (
              <div key={id} className="capi-row">
                <label>
                  Pixel <code>{id}</code> এর Access Token {tokens[id] && <span className="adm-ok">✓ সেভ করা আছে</span>}
                  <input
                    name={`capi_${id}`}
                    type="password"
                    autoComplete="new-password"
                    placeholder={tokens[id] ? "•••••••• (বদলাতে নতুন টোকেন দিন)" : "EAAG... টোকেন পেস্ট করুন"}
                  />
                </label>
                {tokens[id] && (
                  <label className="adm-check">
                    <input type="checkbox" name={`capidel_${id}`} /> এই টোকেন মুছে ফেলুন
                  </label>
                )}
              </div>
            ))}
            <label>
              Test Event Code <small className="adm-muted">(ঐচ্ছিক — Events Manager → Test Events এ দেখতে। টেস্ট শেষে মুছে দিন)</small>
              <input name="fb_test_code" defaultValue={s.fb_test_code} placeholder="যেমন: TEST12345" />
            </label>
          </SaveForm>
        )}
      </div>

      <div className="adm-box adm-narrow">
        <h3>🚫 রিটার্ন/ফেক কাস্টমারদের Ads থেকে বাদ দিন</h3>

        <h4 className="capi-h">উপায় ১ — এখনই করা যায় (Customer list) ✅ সহজ</h4>
        <ol className="capi-steps">
          <li>
            নিচের বাটন চেপে লিস্ট ডাউনলোড করুন (রিটার্ন করা + ব্লক/ফেক নাম্বার):
            <br />
            <a href="/admin/export/returned" className="adm-btn sm">📥 রিটার্ন/ফেক কাস্টমার লিস্ট (CSV)</a>
          </li>
          <li>Ads Manager → <b>Audiences</b> → <b>Create audience → Custom audience</b> → <b>Customer list</b></li>
          <li>ডাউনলোড করা CSV ফাইল আপলোড করুন → নাম দিন “Returned customers” → Create</li>
          <li>প্রতিটি Ad Set → Audience → <b>Exclude</b> এ “Returned customers” দিন</li>
        </ol>
        <p className="adm-muted">নতুন রিটার্ন হলে মাঝে মাঝে আবার ডাউনলোড করে ঐ অডিয়েন্সে আপলোড (Add customers) করবেন।</p>

        <h4 className="capi-h">উপায় ২ — অটোমেটিক (OrderReturned ইভেন্ট)</h4>
        <ol className="capi-steps">
          <li>এটা কাজ করবে <b>প্রথম অর্ডারটি “রিটার্ন” করার পর</b> — তার আগে Facebook এর Events লিস্টে OrderReturned দেখাবে না</li>
          <li>Audiences → Custom audience → <b>Website</b> → Pixel বেছে নিন → Events এ <b>OrderReturned</b> → ১৮০ দিন → Create</li>
          <li>Ad Set → <b>Exclude</b> এ দিন — এরপর থেকে নতুন রিটার্ন নিজে থেকেই যোগ হবে</li>
        </ol>
      </div>
    </>
  );
}
