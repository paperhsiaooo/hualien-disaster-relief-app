"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import imageCompression, { type Options as ImageCompressionOptions } from "browser-image-compression";

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 1;

export type UploadAreaProps = {
  value: File[];
  onChange: (files: File[]) => void;
};

/**
 * 簡化的前端上傳區塊：只在前端限制數量/大小/型別，實際上傳交由外部串接（例如簽名URL）。
 */
export function UploadArea({ value, onChange }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const openCamera = useCallback(() => {
    cameraRef.current?.click();
  }, []);

  const validate = (files: File[]) => {
    if (files.length + value.length > MAX_FILES) {
      return `最多 ${MAX_FILES} 張`;
    }
    for (const f of files) {
      if (!ACCEPT.includes(f.type)) return "僅允許 jpg/jpeg/png/webp/avif";
      if (f.size > MAX_SIZE) return "單檔大小需 ≤ 5MB";
    }
    return null;
  };

  const compressFiles = async (files: File[]) => {
    const compressed: File[] = [];
    const options: ImageCompressionOptions = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    };
    for (const file of files) {
      const blob = await imageCompression(file, options);
      const ext = file.name.split(".").pop() || "jpg";
      const name = `${file.name.replace(/\.[^.]+$/, "")}-compressed.${ext}`;
      compressed.push(new File([blob], name, { type: blob.type }));
    }
    return compressed;
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const msg = validate(arr);
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    try {
      const compressed = await compressFiles(arr);
      onChange([...value, ...compressed]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "壓縮失敗，請稍後再試");
    }
  };

  const removeAt = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openCamera}
          className="h-10 px-4 rounded-md bg-neutral-900 text-white text-sm dark:bg-neutral-100 dark:text-neutral-900"
        >
          拍照
        </button>
        <button
          type="button"
          onClick={openPicker}
          className="h-10 px-4 rounded-md border border-neutral-300 text-sm dark:border-neutral-700"
        >
          選擇照片
        </button>
        <span className="text-xs text-neutral-500">最多 {MAX_FILES} 張，≤ 5MB/張</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple={false}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {/* 單獨的相機 input，避免部分平台忽略 capture 屬性 */}
      <input
        ref={cameraRef}
        type="file"
        accept={ACCEPT.join(",")}
        multiple={false}
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
        capture="environment"
      />
      {error && <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>}
      {value.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {value.map((f, idx) => {
            const url = URL.createObjectURL(f);
            return (
              <div key={idx} className="relative group">
                <div className="relative h-24 w-full overflow-hidden rounded">
                  <Image src={url} alt={f.name} fill className="object-cover" sizes="96px" />
                </div>
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



