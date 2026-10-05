'use client';

import type { PutBlobResult } from '@vercel/blob';
import { useState, useRef } from 'react';

export default function AvatarUploadPage() {
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [blob, setBlob] = useState<PutBlobResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold mb-4">Upload Your Avatar</h1>

        <form
          className="flex flex-col gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            if (!inputFileRef.current?.files || inputFileRef.current.files.length === 0) {
              setError("No file selected");
              return;
            }

            const file = inputFileRef.current.files[0];
            setUploading(true);

            try {
              const response = await fetch(
                `/api/avatar/upload?filename=${encodeURIComponent(file.name)}`,
                {
                  method: 'POST',
                  body: file,
                },
              );

              if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || "Upload failed");
              }

              const newBlob = (await response.json()) as PutBlobResult;
              setBlob(newBlob);
            } catch (err) {
              setError((err as Error).message || "Upload failed");
            } finally {
              setUploading(false);
            }
          }}
        >
          <input
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            required
            className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer"
          />
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2.5 px-4 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

        {blob && (
          <div className="mt-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-400 mb-2">Upload successful!</p>
            <a
              href={`/api/avatar/view?pathname=${encodeURIComponent(blob.pathname)}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 underline text-sm break-all"
            >
              View file ({blob.pathname})
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
