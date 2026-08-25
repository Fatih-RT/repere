import { useEffect, useRef, useState } from "react";

// Thumbnails for locally-picked (not yet uploaded) image files, plus the
// button that opens the file picker. Paste handling lives on the caller's
// textarea (see CreateQuestionPage) since that's where Ctrl+V naturally
// happens — this component only needs to render what's already been picked.
export function ImagePicker({ label, images, onChange }: { label: string; images: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (files.length) onChange([...images, ...files]);
  }

  function removeAt(i: number) {
    onChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {images.map((f, i) => (
        <Thumbnail key={i} file={f} onRemove={() => removeAt(i)} />
      ))}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-md border border-dashed text-[12px]"
        style={{ borderColor: "var(--border2)", color: "var(--muted)" }}
      >
        <i className="ph ph-image" style={{ fontSize: 14 }} /> {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Thumbnail({ file, onRemove }: { file: File; onRemove: () => void }) {
  const url = useObjectUrl(file);
  return (
    <div className="relative w-14 h-14 flex-none rounded-md overflow-hidden border border-border">
      <img src={url} alt="" className="w-full h-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 w-4 h-4 grid place-items-center rounded-full text-white"
        style={{ background: "rgba(0,0,0,.55)" }}
        aria-label="Retirer l'image"
      >
        <i className="ph ph-x" style={{ fontSize: 10 }} />
      </button>
    </div>
  );
}

function useObjectUrl(file: File): string {
  // Lazy initializer: creates exactly one blob URL per File identity, and
  // only that one — no throwaway URL on the first render, no leak.
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

export function extractPastedImages(e: React.ClipboardEvent): File[] {
  const files: File[] = [];
  for (const item of e.clipboardData.items) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
}
