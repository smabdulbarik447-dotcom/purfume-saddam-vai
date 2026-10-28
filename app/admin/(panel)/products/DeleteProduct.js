"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "../../actions";

export default function DeleteProduct({ id, name }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="adm-btn sm danger"
      disabled={pending}
      onClick={() =>
        confirm(`"${name}" মুছে ফেলবেন?`) &&
        startTransition(async () => { await deleteProduct(id); router.refresh(); })
      }
    >
      🗑
    </button>
  );
}
