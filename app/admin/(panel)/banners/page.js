import { getSettings } from "@/lib/store";
import { saveSettingsAction } from "../../actions";
import SaveForm from "../SaveForm";
import GalleryInput from "../GalleryInput";

export default async function BannersPage() {
  const s = await getSettings();
  const images = s.gallery.split("\n").map((x) => x.trim()).filter(Boolean);

  return (
    <>
      <h1 className="adm-title">ব্যানার</h1>
      <p className="adm-muted adm-intro">
        ল্যান্ডিং পেজের উপরের গ্যালারির বাকি ছবিগুলো। সবার প্রথমে (বড় করে) প্রথম পণ্যের ছবি দেখায় — সেটা “পণ্য” থেকে বদলান।
        এখানের ছবিগুলো তার পরে ছোট করে দেখাবে — ← → দিয়ে ক্রম বদলান।
        মুছে “সেভ করুন” চাপলে ছবি স্টোরেজ থেকেও মুছে যাবে।
      </p>

      <div className="adm-box">
        <SaveForm action={saveSettingsAction}>
          <GalleryInput name="gallery" defaultValue={images} />
        </SaveForm>
      </div>
    </>
  );
}
