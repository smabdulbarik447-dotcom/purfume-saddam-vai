// Telegram button e "tel:" link deya jay na — tai ei page khule phone er dialer e number boshay
export async function GET(_req, { params }) {
  const { phone } = await params;
  const num = String(phone).replace(/\D/g, "");
  if (!/^01[3-9]\d{8}$/.test(num)) return new Response("Invalid number", { status: 400 });
  const tel = `tel:+88${num}`;
  const html = `<!doctype html><html lang="bn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>কল ${num}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0714;color:#f5f3ff;font-family:system-ui,sans-serif}
a{display:block;background:#22c55e;color:#fff;text-decoration:none;font-size:1.3rem;font-weight:700;padding:16px 28px;border-radius:999px;text-align:center}
p{text-align:center;color:#b8b0d4}</style></head>
<body><div><a href="${tel}">📞 ${num} কল করুন</a><p>কল না হলে উপরের বাটনে চাপ দিন</p></div>
<script>location.href=${JSON.stringify(tel)}</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
