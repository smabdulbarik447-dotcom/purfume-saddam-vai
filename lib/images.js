import { del } from "@vercel/blob";

// Shudhu amader Blob store e upload kora chobi muche — /images/... (project er nijer chobi) ke hat dey na
const isBlob = (url) => /^https:\/\/[^/]+\.blob\.vercel-storage\.com\//.test(url || "");

export async function deleteImages(urls) {
  const list = urls.filter(isBlob);
  if (!list.length) return;
  try {
    await del(list);
  } catch (err) {
    console.error("Image delete failed", err);
  }
}
