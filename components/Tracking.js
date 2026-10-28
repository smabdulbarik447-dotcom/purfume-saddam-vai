import Script from "next/script";
import { pixelIds } from "@/lib/store";

// Admin > ট্র্যাকিং কোড theke deya Facebook Pixel ID (ekadhik) ar GTM ID boshay.
// Shob pixel init korle fbq('track') er protita event shob pixel e jay.
export default function Tracking({ pixel, gtm }) {
  const ids = pixelIds(pixel);
  const gtmId = /^GTM-[A-Z0-9]{4,12}$/.test(gtm) ? gtm : "";

  return (
    <>
      {ids.length > 0 && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
${ids.map((id) => `fbq('init','${id}');`).join("")}fbq('track','PageView');fbq('track','ViewContent');`}</Script>
      )}
      {gtmId && (
        <Script id="gtm" strategy="afterInteractive">{`
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}</Script>
      )}
    </>
  );
}
