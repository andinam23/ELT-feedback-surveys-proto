"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { guessTermLabel } from "@/lib/util";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [termLabel, setTermLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  function onFileChange(f: File | null) {
    setFile(f);
    if (f && !termLabel) setTermLabel(guessTermLabel(f.name));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setWarnings([]);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("termLabel", termLabel);

    try {
      const res = await fetch("/api/datasets", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        setBusy(false);
        return;
      }
      if (data.warnings?.length) setWarnings(data.warnings);
      router.push(`/datasets/${data.datasetId}`);
      router.refresh();
    } catch {
      setError("Upload failed — could not reach the server.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-black/10 p-5 dark:border-white/15">
      <div>
        <label className="block text-sm font-medium mb-1">Feedback spreadsheet</label>
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-black file:px-3 file:py-1.5 file:text-white dark:file:bg-white dark:file:text-black"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Term label</label>
        <input
          type="text"
          value={termLabel}
          onChange={(e) => setTermLabel(e.target.value)}
          placeholder="e.g. February 2026"
          className="w-full rounded border border-black/15 px-3 py-1.5 text-sm dark:border-white/20 dark:bg-transparent"
          required
        />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Guessed from the filename — edit if it&apos;s wrong. Used for term-over-term comparison later.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {warnings.length > 0 && (
        <ul className="text-xs text-amber-600 dark:text-amber-400 list-disc pl-4">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      <button
        type="submit"
        disabled={busy || !file}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-black"
      >
        {busy ? "Uploading..." : "Upload & process"}
      </button>
    </form>
  );
}
