"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import * as sdk from "matrix-js-sdk";
import { getOrCreateMatrixUser, getMatrixConfig } from "@/app/actions/matrix";

interface ChatContextType {
  client: sdk.MatrixClient | null;
  isInitialized: boolean;
  isConnecting: boolean;
  error: string | null;
  unreadCount: number;
  cryptoReady: boolean;
  keyBackupEnabled: boolean;
  initialize: () => Promise<void>;
  disconnect: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Initialize IndexedDB crypto store for E2EE
 */
async function initCryptoStore(userId: string): Promise<sdk.IndexedDBCryptoStore | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    console.warn("IndexedDB not available, E2EE disabled");
    return null;
  }

  try {
    const cryptoStore = new sdk.IndexedDBCryptoStore(
      window.indexedDB,
      `matrix-crypto-${userId}`
    );
    await cryptoStore.startup();
    return cryptoStore;
  } catch (err) {
    console.error("Failed to initialize crypto store:", err);
    return null;
  }
}

/**
 * Initialize IndexedDB store for sync data
 */
async function initStore(userId: string): Promise<sdk.IndexedDBStore | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return null;
  }

  try {
    const store = new sdk.IndexedDBStore({
      indexedDB: window.indexedDB,
      dbName: `matrix-sync-${userId}`,
      localStorage: window.localStorage,
    });
    await store.startup();
    return store;
  } catch (err) {
    console.error("Failed to initialize IndexedDB store:", err);
    return null;
  }
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [client, setClient] = useState<sdk.MatrixClient | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [cryptoReady, setCryptoReady] = useState(false);
  const [keyBackupEnabled, setKeyBackupEnabled] = useState(false);

  const initialize = useCallback(async () => {
    if (isInitialized || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get or create Matrix credentials
      const result = await getOrCreateMatrixUser();

      if (result.error) {
        setError(result.error);
        setIsConnecting(false);
        return;
      }

      if (!result.accessToken || !result.homeserverUrl || !result.matrixUserId) {
        setError("Failed to get Matrix credentials");
        setIsConnecting(false);
        return;
      }

      // Initialize IndexedDB stores for E2EE
      const [cryptoStore, store] = await Promise.all([
        initCryptoStore(result.matrixUserId),
        initStore(result.matrixUserId),
      ]);

      // Create Matrix client with E2EE support
      const matrixClient = sdk.createClient({
        baseUrl: result.homeserverUrl,
        accessToken: result.accessToken,
        userId: result.matrixUserId,
        deviceId: result.deviceId,
        timelineSupport: true,
        store: store || undefined,
        cryptoStore: cryptoStore || undefined,
      });

      // Initialize crypto (E2EE)
      // Note: Modern matrix-js-sdk versions handle crypto differently
      if (cryptoStore) {
        try {
          // Check which crypto initialization method is available
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const clientAny = matrixClient as any;

          if (typeof clientAny.initRustCrypto === "function") {
            // Newer SDK with Rust crypto
            await clientAny.initRustCrypto();
            setCryptoReady(true);
          } else if (typeof clientAny.initCrypto === "function") {
            // Legacy crypto (older SDK versions)
            await clientAny.initCrypto();
            setCryptoReady(true);
          } else {
            // Crypto might be auto-initialized with cryptoStore option
            console.debug("Crypto auto-initialized via cryptoStore option");
            setCryptoReady(true);
          }

          // Check for key backup (method may vary by SDK version)
          if (typeof clientAny.getKeyBackupVersion === "function") {
            try {
              const backupInfo = await clientAny.getKeyBackupVersion();
              setKeyBackupEnabled(!!backupInfo);
            } catch {
              // Key backup check failed, that's okay
            }
          }

          // Enable cross-signing if available
          if (typeof clientAny.bootstrapCrossSigning === "function") {
            try {
              await clientAny.bootstrapCrossSigning({});
            } catch (crossSignErr) {
              // Cross-signing may not be set up, that's okay
              console.debug("Cross-signing not available:", crossSignErr);
            }
          }
        } catch (cryptoErr) {
          console.error("Failed to initialize crypto:", cryptoErr);
          // Continue without E2EE
        }
      }

      // Set up event listeners
      matrixClient.on(sdk.ClientEvent.Sync, (state) => {
        if (state === "PREPARED") {
          setIsInitialized(true);
          setIsConnecting(false);
          updateUnreadCount(matrixClient);
        }
      });

      matrixClient.on(sdk.ClientEvent.SyncUnexpectedError, (err) => {
        console.error("Matrix sync error:", err);
        setError("Connection lost. Please refresh to reconnect.");
      });

      // Listen for new messages to update unread count
      matrixClient.on(sdk.RoomEvent.Timeline, () => {
        updateUnreadCount(matrixClient);
      });

      matrixClient.on(sdk.RoomEvent.Receipt, () => {
        updateUnreadCount(matrixClient);
      });

      // Start the client
      await matrixClient.startClient({ initialSyncLimit: 20 });

      setClient(matrixClient);
    } catch (err) {
      console.error("Failed to initialize Matrix client:", err);
      setError("Failed to connect to chat. Please try again.");
      setIsConnecting(false);
    }
  }, [isInitialized, isConnecting]);

  const updateUnreadCount = (matrixClient: sdk.MatrixClient) => {
    const rooms = matrixClient.getRooms();
    let total = 0;

    for (const room of rooms) {
      const unread = room.getUnreadNotificationCount(sdk.NotificationCountType.Total);
      total += unread || 0;
    }

    setUnreadCount(total);
  };

  const disconnect = useCallback(() => {
    if (client) {
      client.stopClient();
      setClient(null);
      setIsInitialized(false);
    }
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.stopClient();
      }
    };
  }, [client]);

  return (
    <ChatContext.Provider
      value={{
        client,
        isInitialized,
        isConnecting,
        error,
        unreadCount,
        cryptoReady,
        keyBackupEnabled,
        initialize,
        disconnect,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
