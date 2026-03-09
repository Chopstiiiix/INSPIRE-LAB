"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  File as FileIcon,
  Image as ImageIcon,
  Video,
  Music,
  AlertCircle,
  Lock,
} from "lucide-react";
import {
  downloadAndDecryptFile,
  createBlobUrl,
  formatFileSize,
  isImageMimetype,
  isVideoMimetype,
  isAudioMimetype,
  type EncryptedFileInfo,
} from "@/lib/crypto/file-encryption";

interface AttachmentDisplayProps {
  url: string;
  info: EncryptedFileInfo;
  isOwn?: boolean;
}

type DecryptionState = "idle" | "loading" | "success" | "error";

export function AttachmentDisplay({ url, info, isOwn }: AttachmentDisplayProps) {
  const [state, setState] = useState<DecryptionState>("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const handleDownload = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const decrypted = await downloadAndDecryptFile(url, info);
      const objectUrl = createBlobUrl(decrypted);
      setBlobUrl(objectUrl);
      setState("success");

      // Trigger download
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = info.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt file");
      setState("error");
    }
  }, [url, info]);

  const handlePreview = useCallback(async () => {
    if (blobUrl) {
      window.open(blobUrl, "_blank");
      return;
    }

    setState("loading");
    setError(null);

    try {
      const decrypted = await downloadAndDecryptFile(url, info);
      const objectUrl = createBlobUrl(decrypted);
      setBlobUrl(objectUrl);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt file");
      setState("error");
    }
  }, [url, info, blobUrl]);

  const getFileIcon = () => {
    if (isImageMimetype(info.mimetype))
      return <ImageIcon className="h-5 w-5" />;
    if (isVideoMimetype(info.mimetype)) return <Video className="h-5 w-5" />;
    if (isAudioMimetype(info.mimetype)) return <Music className="h-5 w-5" />;
    return <FileIcon className="h-5 w-5" />;
  };

  const canPreview =
    isImageMimetype(info.mimetype) ||
    isVideoMimetype(info.mimetype) ||
    isAudioMimetype(info.mimetype);

  return (
    <div
      className={`rounded-lg border ${
        isOwn
          ? "bg-blue-700/50 border-blue-600"
          : "bg-neutral-800/50 border-neutral-700"
      } overflow-hidden`}
    >
      {/* Preview area for images */}
      {blobUrl && isImageMimetype(info.mimetype) && (
        <div className="max-w-[300px] max-h-[200px] overflow-hidden">
          <img
            src={blobUrl}
            alt={info.filename}
            className="w-full h-full object-contain cursor-pointer"
            onClick={() => window.open(blobUrl, "_blank")}
          />
        </div>
      )}

      {/* Preview area for video */}
      {blobUrl && isVideoMimetype(info.mimetype) && (
        <div className="max-w-[300px]">
          <video
            src={blobUrl}
            controls
            className="w-full"
            preload="metadata"
          />
        </div>
      )}

      {/* Preview area for audio */}
      {blobUrl && isAudioMimetype(info.mimetype) && (
        <div className="p-2">
          <audio src={blobUrl} controls className="w-full" preload="metadata" />
        </div>
      )}

      {/* File info and actions */}
      <div className="p-3 flex items-center gap-3">
        <div className={`${isOwn ? "text-blue-200" : "text-gray-400"}`}>
          {getFileIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate ${
              isOwn ? "text-white" : "text-gray-200"
            }`}
          >
            {info.filename}
          </p>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs ${isOwn ? "text-blue-200" : "text-gray-500"}`}
            >
              {formatFileSize(info.size)}
            </span>
            <Lock
              className={`h-3 w-3 ${isOwn ? "text-blue-200" : "text-gray-500"}`}
            />
            <span
              className={`text-xs ${isOwn ? "text-blue-200" : "text-gray-500"}`}
            >
              Encrypted
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {state === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : state === "error" ? (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          ) : (
            <>
              {canPreview && !blobUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePreview}
                  className={isOwn ? "text-blue-200 hover:text-white" : ""}
                >
                  Preview
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className={`h-8 w-8 ${
                  isOwn ? "text-blue-200 hover:text-white" : "text-gray-400"
                }`}
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 pb-3">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
