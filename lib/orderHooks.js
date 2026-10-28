import { fbOnStatus } from "./fbcapi";
import { sendConfirmWhatsApp } from "./whatsapp";

/** Status bodlanor por shob "pashe ghota" kaj: Facebook event + কনফার্ম e customer ke WhatsApp */
export async function afterStatusChange(orderId, status) {
  await fbOnStatus(orderId, status);
  if (status === "confirmed") await sendConfirmWhatsApp(orderId);
}
