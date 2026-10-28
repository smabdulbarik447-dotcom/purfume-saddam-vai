// Page er shurute boshe — chobi/lekha dekhanor AGEI lukiye rakhe, jate prothome dekha diye abar hariye na jay (Reveal.js pore anে).
// 3 second er moddhe Reveal na cholle nije theke shob dekhiye dey — kichu jate lukano na thake.
const CODE =
  "if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){" +
  "var d=document.documentElement;d.classList.add('rv-js');setTimeout(function(){d.classList.remove('rv-js')},3000)}";

export default function RevealInit() {
  return <script dangerouslySetInnerHTML={{ __html: CODE }} />;
}
