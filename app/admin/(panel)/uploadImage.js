// Browser e chobi max 1400px webp kore choto kore tarpor /api/upload e pathay
async function shrink(file, maxSize = 1400) {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.85));
    return blob && blob.size < file.size ? new File([blob], "image.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

export async function uploadImage(file, folder) {
  const body = new FormData();
  body.append("file", await shrink(file));
  body.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "আপলোড হয়নি");
  return data.url;
}
