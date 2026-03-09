"use client";

import { useState } from "react";
import { useChatContext } from "./chat-provider";
import { AlertTriangle, X, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Warning banner shown when E2EE key backup is not enabled.
 * Keys stored only in browser - clearing data will lose message history.
 */
export function KeyBackupWarning() {
  const { cryptoReady, keyBackupEnabled, isInitialized } = useChatContext();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not initialized, crypto not ready, backup enabled, or dismissed
  if (!isInitialized || !cryptoReady || keyBackupEnabled || dismissed) {
    return null;
  }

  return (
    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-yellow-200">
            Encryption keys not backed up
          </p>
          <p className="text-xs text-yellow-300/70 mt-1">
            Your message history is encrypted and stored locally. If you clear browser data
            or switch devices, you may lose access to older messages.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-900/50"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Compact encryption status indicator
 */
export function EncryptionStatus({ isEncrypted }: { isEncrypted: boolean }) {
  const { cryptoReady } = useChatContext();

  if (!isEncrypted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Shield className={`h-3.5 w-3.5 ${cryptoReady ? "text-green-400" : "text-yellow-500"}`} />
      <span className={cryptoReady ? "text-green-400" : "text-yellow-500"}>
        {cryptoReady ? "Encrypted" : "E2EE Limited"}
      </span>
    </div>
  );
}
