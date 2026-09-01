"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteDatasetButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this dataset and all its responses/summaries? This can't be undone.")) {
      return;
    }
    setBusy(true);
    await fetch(`/api/datasets/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-xs text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
    >
      Delete
    </button>
  );
}
