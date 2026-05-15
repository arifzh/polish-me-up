"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const BUCKET = "service-images";
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB per image

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "bin";
}

export function ImageDropzone({
  value,
  onChange,
  max = 3,
  pathPrefix = "items",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  pathPrefix?: string;
}) {
  const supabase = createClient();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = max - value.length;
  const canAccept = remaining > 0;

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError(null);

      if (!canAccept) {
        setError(`You can upload up to ${max} images.`);
        return;
      }

      const accepted: File[] = [];
      for (const f of list) {
        if (accepted.length >= remaining) break;
        if (!ACCEPT.includes(f.type)) {
          setError(`Unsupported file type: ${f.name}`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          setError(`${f.name} is larger than 4 MB.`);
          continue;
        }
        accepted.push(f);
      }

      if (accepted.length === 0) return;

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const file of accepted) {
        const path = `${pathPrefix}/${crypto.randomUUID()}.${extFromFile(file)}`;
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadErr) {
          setError(uploadErr.message);
          continue;
        }

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (pub?.publicUrl) {
          uploadedUrls.push(pub.publicUrl);
        }
      }

      if (uploadedUrls.length > 0) {
        onChange([...value, ...uploadedUrls].slice(0, max));
      }
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    },
    [canAccept, max, onChange, pathPrefix, remaining, supabase, value],
  );

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    if (canAccept) setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function removeAt(idx: number) {
    const next = value.filter((_, i) => i !== idx);
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {value.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-[#F8BBD0] bg-white/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#BE185D] uppercase">
              <ImagePlus className="size-3.5" />
              Current photos
            </p>
            <span className="rounded-full bg-[#FFE4EC] px-2.5 py-0.5 text-[10px] font-semibold text-[#BE185D]">
              {value.length} / {max}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {value.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="group relative aspect-square overflow-hidden rounded-xl border border-[#F8BBD0] bg-[#FFF5F8]"
              >
                <Image
                  src={url}
                  alt={`Item photo ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 200px, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  unoptimized
                />
                {/* Slot index — top-left */}
                <span className="absolute top-1.5 left-1.5 inline-flex size-6 items-center justify-center rounded-full bg-white/95 text-[11px] font-bold text-[#3D1A2A] shadow-sm">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-white/95 text-[#BE185D] shadow-md transition-all hover:scale-105 hover:text-rose-600 sm:size-7 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#DB2777] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase shadow">
                    Cover
                  </span>
                )}
              </div>
            ))}
            {/* Empty slots so the user can see how many remain */}
            {Array.from({ length: Math.max(0, max - value.length) }).map(
              (_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/50 text-[11px] text-[#5C2D48]/50"
                >
                  Slot {value.length + i + 1}
                </div>
              ),
            )}
          </div>
          <p className="text-[11px] text-[#5C2D48]/70">
            <span className="hidden sm:inline">
              Hover a photo to remove it.
            </span>
            <span className="sm:hidden">Tap × to remove a photo.</span>{" "}
            Slot 1 is the cover image on the customer-facing card.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 px-4 py-3 text-center text-xs text-[#5C2D48]/70">
          No photos saved yet - drop up to {max} below to add them.
        </p>
      )}

      {canAccept && (
        <div className="space-y-2">
          <label
            htmlFor={inputId}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-6 text-center transition-all sm:py-8 ${
              dragOver
                ? "border-[#EC4899] bg-[#FFE4EC]/80"
                : "border-[#F8BBD0] bg-[#FFF5F8]/60 hover:bg-[#FFE4EC]/50"
            } ${uploading ? "pointer-events-none opacity-70" : ""}`}
          >
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#EC4899] to-[#DB2777] text-white shadow-md">
              {uploading ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
            </span>
            <p className="text-sm font-medium text-[#3D1A2A]">
              {uploading ? (
                "Uploading…"
              ) : (
                <>
                  <span className="hidden sm:inline">
                    Drop images here or click to upload
                  </span>
                  <span className="sm:hidden">Tap to choose from library</span>
                </>
              )}
            </p>
            <p className="text-xs text-[#5C2D48]/70">
              JPG, PNG, WebP, GIF · max {Math.round(MAX_BYTES / (1024 * 1024))} MB
              each · {remaining} slot{remaining === 1 ? "" : "s"} left of {max}
            </p>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept={ACCEPT.join(",")}
              multiple={max - value.length > 1}
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
          </label>

          {/* Mobile-only camera shortcut */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F8BBD0] bg-white px-4 py-3 text-sm font-medium text-[#3D1A2A] shadow-sm transition-colors hover:bg-[#FFE4EC]/50 active:scale-[0.99] disabled:opacity-50 sm:hidden"
          >
            <Camera className="size-4 text-[#EC4899]" />
            Take a photo with camera
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />
        </div>
      )}

      {!canAccept && (
        <p className="rounded-lg border border-dashed border-[#F8BBD0] bg-[#FFF5F8]/40 px-4 py-3 text-center text-xs text-[#5C2D48]/70">
          You&apos;ve reached the {max}-image limit. Remove one to add another.
        </p>
      )}

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}
    </div>
  );
}
