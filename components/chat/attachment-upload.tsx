"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2, File as FileIcon, Image, Video, Music } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import {
  encryptFile,
  formatFileSize,
  isImageMimetype,
  isVideoMimetype,
  isAudioMimetype,
  type EncryptedFileInfo,
} from "@/lib/crypto/file-encryption";

interface AttachmentUploadProps {
  onUploadComplete: (url: string, info: EncryptedFileInfo) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function AttachmentUpload({
  onUploadComplete,
  onCancel,
  disabled,
}: AttachmentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useUploadThing("encryptedAttachment", {
    onUploadProgress: (p) => setProgress(p),
    onUploadError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        // Validate file size (16MB limit)
        if (selectedFile.size > 16 * 1024 * 1024) {
          setError("File size must be less than 16MB");
          return;
        }
        setFile(selectedFile);
        setError(null);
      }
    },
    []
  );

  const handleUpload = useCallback(async () => {
    if (!file) return;

    setError(null);
    setIsEncrypting(true);

    try {
      // Step 1: Encrypt the file client-side
      const { encryptedBlob, info } = await encryptFile(file);

      setIsEncrypting(false);
      setIsUploading(true);

      // Step 2: Upload the encrypted blob
      // Create a File object from the encrypted blob
      // Use globalThis.File to avoid conflict with lucide-react File icon
      const NativeFile = globalThis.File;
      const encryptedFile = new NativeFile(
        [encryptedBlob],
        `encrypted_${Date.now()}`,
        { type: "application/octet-stream" }
      );

      const result = await startUpload([encryptedFile]);

      if (!result || result.length === 0) {
        throw new Error("Upload failed");
      }

      // Step 3: Pass URL and encryption info to parent
      // The encryption info (key, iv, hash) is kept client-side
      // and will be included in the Matrix message event
      onUploadComplete(result[0].ufsUrl, info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsEncrypting(false);
      setIsUploading(false);
    }
  }, [file, startUpload, onUploadComplete]);

  const getFileIcon = () => {
    if (!file) return <FileIcon className="h-8 w-8" />;
    if (isImageMimetype(file.type)) return <Image className="h-8 w-8" />;
    if (isVideoMimetype(file.type)) return <Video className="h-8 w-8" />;
    if (isAudioMimetype(file.type)) return <Music className="h-8 w-8" />;
    return <FileIcon className="h-8 w-8" />;
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-700">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-white">Attach File</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400"
          onClick={onCancel}
          disabled={isEncrypting || isUploading}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-600 rounded-lg cursor-pointer hover:border-neutral-500 transition-colors"
        >
          <Paperclip className="h-8 w-8 text-gray-500 mb-2" />
          <p className="text-sm text-gray-400">Click to select a file</p>
          <p className="text-xs text-gray-500 mt-1">Max 16MB</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-neutral-800 rounded-lg">
            <div className="text-gray-400">{getFileIcon()}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 flex-shrink-0"
              onClick={() => setFile(null)}
              disabled={isEncrypting || isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {(isEncrypting || isUploading) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isEncrypting
                    ? "Encrypting..."
                    : `Uploading ${progress}%`}
                </span>
              </div>
              <div className="h-1 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${isEncrypting ? 50 : progress}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isEncrypting || isUploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={disabled || isEncrypting || isUploading}
              className="flex-1"
            >
              {isEncrypting || isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AttachmentButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AttachmentButton({ onClick, disabled }: AttachmentButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      className="text-gray-400 hover:text-white"
    >
      <Paperclip className="h-5 w-5" />
    </Button>
  );
}
