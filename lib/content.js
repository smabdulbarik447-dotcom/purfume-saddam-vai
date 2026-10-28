import { site, bn } from "@/data/site";

/**
 * Landing page er shob lekha — admin > "ল্যান্ডিং পেজ টেক্সট" theke bodlano jay.
 * Lekhay {price}, {old_price}, {save}, {off}, {brand}, {inside}, {outside}, {free_boxes} dile nije boshe.
 * [ ] er bhitorer lekha sonali (gradient) highlight hoy.
 */
export const SECTIONS = [
  {
    id: "seo", title: "🔎 গুগল/ফেসবুক শেয়ার টাইটেল",
    fields: [
      ["meta_title", "পেজের টাইটেল", "সিগনেচার পারফিউম কম্বো — মাত্র {price} টাকা | {brand}"],
      ["meta_desc", "ছোট বর্ণনা", "৪ ইন ১ সিগনেচার পারফিউম কম্বো + ১টি সিক্রেট ৬ মিলি আতর ফ্রি। সারা দেশে ক্যাশ অন ডেলিভারি।", true],
    ],
  },
  {
    id: "top", title: "📢 একদম উপরের অফার বার ও হেডার",
    fields: [
      ["topbar", "অফার বার", "🔥 স্পেশাল অফার: ৪ ইন ১ সিগনেচার কম্বো মাত্র {price} টাকা + ১ টি সিক্রেট ৬ মিলি আতর সম্পূর্ণ ফ্রি!"],
      ["topbar_cod", "অফার বারের পাশের লেখা", "ক্যাশ অন ডেলিভারি (খুলে চেক করার সুবিধা)"],
      ["header_btn", "হেডারের বাটন", "অর্ডার করুন"],
    ],
  },
  {
    id: "hero", title: "⭐ প্রথম অংশ (হিরো)",
    fields: [
      ["offer_strip", "অফার লাইন", "🔥 অফার: সিগনেচার কম্বো মাত্র {price} টাকায় + ১ টি সিক্রেট ৬ মিলি আতর ফ্রি!"],
      ["offer_strip_sub", "অফার লাইনের নিচে", "সারা দেশে ক্যাশ অন ডেলিভারি"],
      ["gallery_badge", "ছবির উপরের ব্যাজ", "🎁 +১টি ৬মিলি আতর ফ্রি"],
      ["hero_eyebrow", "ছোট লেবেল", "✨ PREMIUM COLLECTION"],
      ["hero_title", "বড় হেডিং", "সিগনেচার পারফিউম কম্বো"],
      ["hero_sub", "হেডিংয়ের নিচে", "আপনার ব্যক্তিত্বকে ফুটিয়ে তুলতে একটি আদর্শ চয়েজ"],
      ["rating", "রেটিং", "4.9 / 5.0"],
      ["rating_note", "রেটিংয়ের পাশে", "(১,০০০+ ভেরিফাইড রিভিউ)"],
      ["price_label", "দামের উপরে", "অফার মূল্য:"],
      ["save_text", "সাশ্রয়ের লেখা", "{save} টাকা সাশ্রয় ({off}% ছাড়)"],
      ["gift_title", "গিফট লাইন", "🎁 সাথে পাচ্ছেন ১টি সিক্রেট 6 মিলি \"Secret Perfume\""],
      ["gift_sub", "গিফটের নিচে", "লং-লাস্টিং প্রিমিয়াম আতর সম্পূর্ণ ফ্রি!"],
      ["hero_btn", "অর্ডার বাটন", "অর্ডার করতে এখানে ক্লিক করুন 👉"],
      ["wa_btn", "হোয়াটসঅ্যাপ বাটন", "💬 হোয়াটসঅ্যাপে অর্ডার"],
      ["info1_title", "ছোট বক্স ১ — হেডিং", "🚚 হোম ডেলিভারি"],
      ["info1_text", "ছোট বক্স ১ — লেখা (খালি রাখলে ডেলিভারি চার্জ দেখাবে)", "{free_boxes} বক্সে ফ্রি ডেলিভারি"],
      ["info2_title", "ছোট বক্স ২ — হেডিং", "💵 ক্যাশ অন ডেলিভারি"],
      ["info2_text", "ছোট বক্স ২ — লেখা", "হাতে পেয়ে মূল্য পরিশোধ"],
      ["info3_title", "ছোট বক্স ৩ — হেডিং", "🎁 ফ্রি গিফট আতর"],
      ["info3_text", "ছোট বক্স ৩ — লেখা", "৬ মিলি সিক্রেট পারফিউম"],
    ],
    list: { key: "features", title: "৪টি ফিচার বক্স", fields: [["icon", "আইকন"], ["title", "হেডিং"], ["text", "লেখা"]] },
  },
  {
    id: "collection", title: "🧴 কালেকশন (৪টি সুবাস)",
    fields: [
      ["col_eyebrow", "ছোট লেবেল", "✨ এক্সক্লুসিভ কালেকশন"],
      ["col_title", "হেডিং ([ ] = হাইলাইট)", "বেস্ট সেলিং [৪টি ইউনিক সুবাস]"],
      ["col_text", "হেডিংয়ের নিচে", "অফিস, মিটিং, ক্যাজুয়াল কিংবা নাইট পার্টি—যেকোনো মুহূর্তের জন্য ৪টি ভিন্ন মেজাজের মাস্টারপিস সুবাস", true],
      ["col_card_sub", "কার্ডের নিচের ছোট লেখা", "15ml EDP"],
      ["col_volume", "বড় ছবির উপরের লেখা", "15ml EDP • Concentrated EDP"],
      ["col_notes_label", "নোটস এর হেডিং", "মুখ্য সুবাস নোটস:"],
      ["col_vibe_label", "ব্যবহারের সময় হেডিং", "ব্যবহারের উপযুক্ত সময়:"],
      ["col_btn", "বাটন", "অর্ডার করুন 👉"],
    ],
    list: {
      key: "perfumes", title: "সুবাসগুলো",
      fields: [["image", "ছবি", "image"], ["short", "ছোট নাম"], ["name", "পুরো নাম"], ["badge", "ব্যাজ"], ["subtitle", "সাবটাইটেল"], ["description", "বর্ণনা", true], ["vibe", "ব্যবহারের সময়"], ["notes", "নোটস (কমা দিয়ে আলাদা)"]],
    },
  },
  {
    id: "gift", title: "🎁 ফ্রি গিফট অংশ",
    fields: [
      ["gift_eyebrow", "ছোট লেবেল", "🎁 ফ্রি বোনাস উপহার"],
      ["gift_heading", "হেডিং ([ ] = হাইলাইট)", "সাথে আরো পাচ্ছেন ১ টি সিক্রেট 6 মিলি [\"Secret Perfume\"] সম্পূর্ণ ফ্রি!"],
      ["gift_text", "লেখা", "৪টি ১৫ মিলি বোতলের সাথে ১টি স্পেশাল আতর ফ্রি দেওয়া হচ্ছে আপনার সুবাসের অভিজ্ঞতাকে পরিপূর্ণ করতে।", true],
      ["gift_btn", "বাটন", "অফারটি লুফে নিন (৳{price})"],
    ],
  },
  {
    id: "compare", title: "⚖️ আসল বনাম সাধারণ",
    fields: [
      ["cmp_eyebrow", "ছোট লেবেল", "⚖️ কেন আমরা সেরা"],
      ["cmp_title", "হেডিং ([ ] = হাইলাইট)", "আসল পারফিউম বনাম [সাধারণের পার্থক্য]"],
      ["cmp_text", "হেডিংয়ের নিচে", "বাজারে সস্তা পারফিউমের ভিড়ে কেন এই সিগনেচার কম্বো আপনার ব্যক্তিত্বের জন্য একমাত্র সঠিক নির্বাচন?", true],
      ["good_small", "ভালো দিক — ছোট লেখা", "১০০% আসল প্রিমিয়াম"],
      ["good_title", "ভালো দিক — হেডিং", "সিগনেচার কম্বো"],
      ["trust", "ভালো দিকের নিচের লাইন", "🛡️ ৯৮% রিপিট কাস্টমার ও সন্তুষ্ট গ্রাহকের আস্থা!"],
      ["bad_small", "খারাপ দিক — ছোট লেখা", "বাজারের লোকাল কপি"],
      ["bad_title", "খারাপ দিক — হেডিং", "সাধারণ সস্তা পারফিউম"],
      ["cmp_btn", "বাটন", "আসল সিগনেচার কম্বো অর্ডার করুন 👉"],
    ],
    list: { key: "pros", title: "ভালো দিক (✓)", fields: [["title", "হেডিং"], ["text", "লেখা"]] },
    list2: { key: "cons", title: "খারাপ দিক (✕)", fields: [["title", "হেডিং"], ["text", "লেখা"]] },
  },
  {
    id: "package", title: "📦 অফার প্যাকেজ",
    fields: [
      ["pkg_eyebrow", "ছোট লেবেল", "✨ স্পেশাল অফার প্যাকেজ"],
      ["pkg_title", "হেডিং ([ ] = হাইলাইট)", "এক্সক্লুসিভ [অফার প্যাকেজ]"],
      ["pkg_text", "হেডিংয়ের নিচে", "{brand} সিগনেচার কম্বো প্যাকের সাথে লুফে নিন আকর্ষণীয় ডিসকাউন্ট ও ফ্রি গিফট"],
      ["pkg_name", "প্যাকেজের নাম", "{brand} সিগনেচার কম্বো প্যাক"],
      ["pkg_sub", "নামের নিচে", "৪ ইন ১ প্রিমিয়াম পারফিউম সেট (১৫ মিলি প্রতিটি)"],
      ["pkg_gift", "গিফট লাইন", "🎁 সাথে পাচ্ছেন ১টি সিক্রেট ৬ মিলি \"Secret Perfume\" আতর সম্পূর্ণ ফ্রি!"],
      ["pkg_btn", "বাটন", "অর্ডার করতে এখানে ক্লিক করুন (৳{price}) 👉"],
    ],
    list: { key: "checks", title: "টিক চিহ্নের পয়েন্ট", fields: [["bold", "মোটা লেখা"], ["text", "বাকি লেখা"]] },
  },
  {
    id: "cod", title: "💵 ক্যাশ অন ডেলিভারি ব্যানার",
    fields: [
      ["cod_title", "হেডিং", "সারা বাংলাদেশে ক্যাশ অন ডেলিভারি!"],
      ["cod_text", "লেখা", "পার্সেল হাতে পেয়ে দেখে দেখে মূল্য পরিশোধ করার সুবিধা।"],
      ["cod_btn", "বাটন", "অর্ডার করুন"],
    ],
  },
  {
    id: "form", title: "📝 অর্ডার ফর্ম",
    fields: [
      ["order_title", "ফর্মের উপরের হেডিং ([ ] = হাইলাইট)", "অর্ডার করতে আপনার তথ্য দিয়ে [নিচের ফরমটি পুরন করুন]"],
      ["form_head", "প্যাকেজ বাছাইয়ের হেডিং", "পছন্দের ফ্লেভার কম্বো সিলেক্ট করুন"],
      ["billing_title", "তথ্যের হেডিং", "Billing details"],
      ["name_label", "নামের লেবেল", "আপনার নাম"],
      ["name_ph", "নামের ঘরের ভেতরের লেখা", "আপনার নাম"],
      ["address_label", "ঠিকানার লেবেল", "আপনার ঠিকানা"],
      ["address_ph", "ঠিকানার ঘরের ভেতরের লেখা", "বাসা/রোড, থানা, জেলা"],
      ["phone_label", "মোবাইলের লেবেল", "মোবাইল নাম্বার"],
      ["shipping_title", "ডেলিভারির হেডিং", "Shipping"],
      ["free_hint", "ফ্রি ডেলিভারির ইঙ্গিত", "🚚 {free_boxes} বক্স বা বেশি নিলে ডেলিভারি চার্জ ফ্রি!"],
      ["free_done", "ফ্রি ডেলিভারি পেলে", "🎉 অভিনন্দন! আপনার ডেলিভারি চার্জ সম্পূর্ণ ফ্রি"],
      ["summary_title", "অর্ডারের সারাংশ হেডিং", "Your order"],
      ["cod_label", "পেমেন্ট", "ক্যাশ অন ডেলিভারি"],
      ["hadith", "হাদিস/নোট", "রাসুল (সা.) বলেছেন : যদি কোনো ব্যক্তি পণ্য কেনার উদ্দেশ্য ছাড়াই ক্রেতা সেজে বিক্রেতাকে বিপদে ফেলার জন্য পরিস্থিতি তৈরি করে। এটি বিক্রেতা বা সাধারণ ক্রেতা উভয়ের জন্যই ক্ষতিকর। (সহীহ বুখারী : ২১৪০)", true],
      ["privacy", "প্রাইভেসি লেখা", "Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.", true],
      ["submit_btn", "অর্ডার বাটন (টাকা নিজে যোগ হয়)", "অর্ডার করুন"],
      ["success_title", "অর্ডারের পর — হেডিং", "ধন্যবাদ! আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে"],
      ["success_text", "অর্ডারের পর — লেখা", "আমাদের প্রতিনিধি খুব শীঘ্রই আপনাকে কল করে অর্ডার কনফার্ম করবেন।"],
    ],
  },
  {
    id: "footer", title: "🔻 ফুটার",
    fields: [
      ["footer_call", "কলের লেখা (নাম্বার নিজে বসে)", "যেকোনো প্রয়োজনে কল করুন:"],
      ["footer_copy", "কপিরাইট", "© {year} {brand}. All rights reserved."],
    ],
  },
];

const LIST_DEFAULTS = {
  features: site.features.map(({ icon, title, text }) => ({ icon, title, text })),
  perfumes: site.perfumes.map((p) => ({ ...p, notes: p.notes.join(", ") })),
  pros: site.pros,
  cons: site.cons,
  checks: [
    { bold: "৪টি প্রিমিয়াম EDP পারফিউম:", text: "ভ্যাম্পায়ার ব্লাড, ডিওর সভেজ, হাওয়াস আইস ও হাওয়াস ফায়ার।" },
    { bold: "মোট ৬০ মিলি কন্সেন্ট্রেটেড পারফিউম:", text: "যা দেবে দীর্ঘ ৬-৭ ঘণ্টার স্থায়ী সুবাস।" },
    { bold: "ক্যাশ অন ডেলিভারি:", text: "সারা বাংলাদেশে ডেলিভারি ম্যানের সামনে প্যাকেট খুলে চেক করে নেওয়ার সুবিধা।" },
  ],
};

export const DEFAULT_TEXT = Object.fromEntries(SECTIONS.flatMap((s) => s.fields.map(([k, , d]) => [k, d])));
export const DEFAULT_LISTS = LIST_DEFAULTS;

/** settings.content (JSON) ar default mile shob lekha */
export function getContent(settings) {
  let saved = {};
  try { saved = JSON.parse(settings.content || "{}") || {}; } catch {}
  const text = { ...DEFAULT_TEXT, ...(saved.text || {}) };
  const lists = {};
  for (const [k, def] of Object.entries(LIST_DEFAULTS)) {
    const s = saved.lists?.[k];
    lists[k] = Array.isArray(s) ? s : def;
  }
  return { text, lists };
}

/** {price} er moto token boshano */
export function fillTokens(str, vars) {
  return String(str ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

export function tokenVars({ price, oldPrice, brand, delivery, freeBoxes }) {
  const save = Math.max(0, oldPrice - price);
  return {
    price: bn(price),
    old_price: bn(oldPrice),
    save: bn(save),
    off: bn(oldPrice ? Math.round((save / oldPrice) * 100) : 0),
    brand,
    inside: bn(delivery?.[0]?.charge ?? 0),
    outside: bn(delivery?.[1]?.charge ?? 0),
    free_boxes: bn(freeBoxes || 0),
    year: new Date().getFullYear(),
  };
}
