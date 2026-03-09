"use client";

import { useState } from "react";
import Image from "next/image";
import { useUploadThing } from "@/lib/uploadthing";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadComplete: (url: string) => void;
  currentVisibility?: string;
  onVisibilityChange?: (visibility: string) => void;
}

export function AvatarUpload({ currentAvatar, onUploadComplete, currentVisibility = "PUBLIC", onVisibilityChange }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { startUpload } = useUploadThing("avatarUploader");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const result = await startUpload([file]);
      if (result && result[0]) {
        onUploadComplete(result[0].url);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      {currentAvatar ? (
        <Image
          src={currentAvatar}
          alt="Avatar"
          width={100}
          height={100}
          className="border border-white"
        />
      ) : (
        <div className="w-24 h-24 border border-white flex items-center justify-center">
          <span className="text-2xl">?</span>
        </div>
      )}

      <div>
        <label
          htmlFor="avatar-upload"
          className="inline-block px-4 py-2 font-medium border bg-transparent text-white border-white hover:bg-white hover:text-black transition-colors cursor-pointer"
        >
          {isUploading ? "Uploading..." : "Upload Avatar"}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />
        <p className="text-sm opacity-75 mt-2">Max 4MB, JPG or PNG</p>
        {onVisibilityChange && (
          <div className="mt-3">
            <Select value={currentVisibility} onValueChange={onVisibilityChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="CONNECTIONS_ONLY">Connections Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
