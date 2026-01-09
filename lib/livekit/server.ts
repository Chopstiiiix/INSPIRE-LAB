/**
 * LiveKit Server SDK Wrapper
 *
 * Provides helpers for server-side LiveKit operations:
 * - Token generation for room access
 * - Room management
 * - Participant management
 *
 * Requires environment variables:
 * - LIVEKIT_URL: LiveKit server URL (ws:// or wss://)
 * - LIVEKIT_API_KEY: API key for authentication
 * - LIVEKIT_API_SECRET: API secret for token signing
 */

import { AccessToken, RoomServiceClient, type VideoGrant } from "livekit-server-sdk";

// =============================================================================
// Configuration
// =============================================================================

const config = {
  get url() {
    const url = process.env.LIVEKIT_URL;
    if (!url) throw new Error("LIVEKIT_URL is not configured");
    return url;
  },
  get apiKey() {
    const key = process.env.LIVEKIT_API_KEY;
    if (!key) throw new Error("LIVEKIT_API_KEY is not configured");
    return key;
  },
  get apiSecret() {
    const secret = process.env.LIVEKIT_API_SECRET;
    if (!secret) throw new Error("LIVEKIT_API_SECRET is not configured");
    return secret;
  },
  get httpUrl() {
    // Convert WebSocket URL to HTTP for API calls
    return config.url.replace("ws://", "http://").replace("wss://", "https://");
  },
  get turnUrls() {
    const urls = process.env.TURN_URLS;
    return urls ? urls.split(",").map((u) => u.trim()) : [];
  },
};

// =============================================================================
// Types
// =============================================================================

export interface TokenOptions {
  /** User's unique identifier */
  identity: string;
  /** Display name shown in room */
  name?: string;
  /** Token TTL in seconds (default: 3600 = 1 hour) */
  ttl?: number;
  /** Room permissions */
  permissions?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    canUpdateOwnMetadata?: boolean;
  };
  /** User metadata (JSON string) */
  metadata?: string;
}

export interface RoomOptions {
  /** Room name */
  name: string;
  /** Empty room timeout in seconds (default: 300) */
  emptyTimeout?: number;
  /** Maximum participants (default: 50) */
  maxParticipants?: number;
  /** Metadata for the room */
  metadata?: string;
}

export interface Participant {
  sid: string;
  identity: string;
  name: string;
  state: number;
  joinedAt: bigint;
  metadata?: string;
}

export interface Room {
  sid: string;
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  creationTime: bigint;
  numParticipants: number;
  metadata?: string;
}

// =============================================================================
// Token Generation
// =============================================================================

/**
 * Generate an access token for joining a room
 *
 * @example
 * ```ts
 * const token = await generateToken("my-room", {
 *   identity: "user-123",
 *   name: "John Doe",
 *   ttl: 3600,
 * });
 * ```
 */
export async function generateToken(
  roomName: string,
  options: TokenOptions
): Promise<string> {
  const { identity, name, ttl = 3600, permissions = {}, metadata } = options;

  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name: name || identity,
    ttl,
    metadata,
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: permissions.canPublish !== false,
    canSubscribe: permissions.canSubscribe !== false,
    canPublishData: permissions.canPublishData !== false,
    canUpdateOwnMetadata: permissions.canUpdateOwnMetadata !== false,
  };

  token.addGrant(grant);

  return await token.toJwt();
}

/**
 * Generate a token for a DM video call
 * Both participants get full permissions
 */
export async function generateDMToken(
  userAId: string,
  userBId: string,
  currentUserId: string,
  currentUserName: string
): Promise<{ token: string; roomName: string }> {
  // Sort IDs to ensure consistent room name
  const sorted = [userAId, userBId].sort();
  const roomName = `dm_${sorted[0]}_${sorted[1]}`;

  const token = await generateToken(roomName, {
    identity: currentUserId,
    name: currentUserName,
    ttl: 3600,
    permissions: {
      canPublish: true,
      canSubscribe: true,
    },
  });

  return { token, roomName };
}

/**
 * Generate a token for a project/group video call
 */
export async function generateProjectToken(
  projectId: string,
  userId: string,
  userName: string,
  options?: { isHost?: boolean }
): Promise<{ token: string; roomName: string }> {
  const roomName = `project_${projectId}`;

  const token = await generateToken(roomName, {
    identity: userId,
    name: userName,
    ttl: 3600,
    permissions: {
      canPublish: true,
      canSubscribe: true,
    },
    metadata: options?.isHost ? JSON.stringify({ isHost: true }) : undefined,
  });

  return { token, roomName };
}

/**
 * Generate a view-only token (can subscribe but not publish)
 */
export async function generateViewerToken(
  roomName: string,
  identity: string,
  name?: string
): Promise<string> {
  return generateToken(roomName, {
    identity,
    name,
    ttl: 3600,
    permissions: {
      canPublish: false,
      canSubscribe: true,
      canPublishData: false,
    },
  });
}

// =============================================================================
// Room Management
// =============================================================================

/**
 * Get the RoomServiceClient instance
 */
function getRoomService(): RoomServiceClient {
  return new RoomServiceClient(config.httpUrl, config.apiKey, config.apiSecret);
}

/**
 * Create a new room
 */
export async function createRoom(options: RoomOptions): Promise<Room> {
  const roomService = getRoomService();

  const room = await roomService.createRoom({
    name: options.name,
    emptyTimeout: options.emptyTimeout || 300,
    maxParticipants: options.maxParticipants || 50,
    metadata: options.metadata,
  });

  return {
    sid: room.sid,
    name: room.name,
    emptyTimeout: room.emptyTimeout,
    maxParticipants: room.maxParticipants,
    creationTime: room.creationTime,
    numParticipants: room.numParticipants,
    metadata: room.metadata,
  };
}

/**
 * List all active rooms
 */
export async function listRooms(names?: string[]): Promise<Room[]> {
  const roomService = getRoomService();
  const rooms = await roomService.listRooms(names);

  return rooms.map((room) => ({
    sid: room.sid,
    name: room.name,
    emptyTimeout: room.emptyTimeout,
    maxParticipants: room.maxParticipants,
    creationTime: room.creationTime,
    numParticipants: room.numParticipants,
    metadata: room.metadata,
  }));
}

/**
 * Get a specific room by name
 */
export async function getRoom(roomName: string): Promise<Room | null> {
  const rooms = await listRooms([roomName]);
  return rooms.length > 0 ? rooms[0] : null;
}

/**
 * Delete a room
 */
export async function deleteRoom(roomName: string): Promise<void> {
  const roomService = getRoomService();
  await roomService.deleteRoom(roomName);
}

/**
 * Update room metadata
 */
export async function updateRoomMetadata(
  roomName: string,
  metadata: string
): Promise<void> {
  const roomService = getRoomService();
  await roomService.updateRoomMetadata(roomName, metadata);
}

// =============================================================================
// Participant Management
// =============================================================================

/**
 * List participants in a room
 */
export async function listParticipants(roomName: string): Promise<Participant[]> {
  const roomService = getRoomService();
  const participants = await roomService.listParticipants(roomName);

  return participants.map((p) => ({
    sid: p.sid,
    identity: p.identity,
    name: p.name,
    state: p.state,
    joinedAt: p.joinedAt,
    metadata: p.metadata,
  }));
}

/**
 * Get a specific participant
 */
export async function getParticipant(
  roomName: string,
  identity: string
): Promise<Participant | null> {
  try {
    const roomService = getRoomService();
    const participant = await roomService.getParticipant(roomName, identity);

    return {
      sid: participant.sid,
      identity: participant.identity,
      name: participant.name,
      state: participant.state,
      joinedAt: participant.joinedAt,
      metadata: participant.metadata,
    };
  } catch {
    return null;
  }
}

/**
 * Remove a participant from a room
 */
export async function removeParticipant(
  roomName: string,
  identity: string
): Promise<void> {
  const roomService = getRoomService();
  await roomService.removeParticipant(roomName, identity);
}

/**
 * Mute a participant's track
 */
export async function muteParticipantTrack(
  roomName: string,
  identity: string,
  trackSid: string,
  muted: boolean
): Promise<void> {
  const roomService = getRoomService();
  await roomService.mutePublishedTrack(roomName, identity, trackSid, muted);
}

/**
 * Update participant metadata
 */
export async function updateParticipantMetadata(
  roomName: string,
  identity: string,
  metadata: string
): Promise<void> {
  const roomService = getRoomService();
  await roomService.updateParticipant(roomName, identity, metadata);
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a room has active participants
 */
export async function isRoomActive(roomName: string): Promise<boolean> {
  const room = await getRoom(roomName);
  return room !== null && room.numParticipants > 0;
}

/**
 * Get the number of participants in a room
 */
export async function getParticipantCount(roomName: string): Promise<number> {
  const room = await getRoom(roomName);
  return room?.numParticipants || 0;
}

/**
 * Generate a room name for DM calls
 */
export function getDMRoomName(userAId: string, userBId: string): string {
  const sorted = [userAId, userBId].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

/**
 * Generate a room name for project calls
 */
export function getProjectRoomName(projectId: string): string {
  return `project_${projectId}`;
}

/**
 * Get client configuration
 */
export function getClientConfig() {
  return {
    url: config.url,
    turnUrls: config.turnUrls,
  };
}

/**
 * Check if LiveKit server is reachable
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(config.httpUrl);
    return response.ok || response.status === 404; // 404 is expected at root
  } catch {
    return false;
  }
}

// =============================================================================
// Compatibility Aliases (for server actions)
// =============================================================================

/**
 * @alias generateToken - Legacy function signature for server actions
 */
export async function generateRoomToken(
  roomName: string,
  identity: string,
  name: string,
  options?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    ttl?: number;
  }
): Promise<string> {
  return generateToken(roomName, {
    identity,
    name,
    ttl: options?.ttl || 3600,
    permissions: {
      canPublish: options?.canPublish ?? true,
      canSubscribe: options?.canSubscribe ?? true,
    },
  });
}

/**
 * @alias getDMRoomName - Generate room name for DM video calls
 */
export function generateDMRoomName(userAId: string, userBId: string): string {
  return getDMRoomName(userAId, userBId);
}

/**
 * @alias getProjectRoomName - Generate room name for project video calls
 */
export function generateProjectRoomName(projectId: string): string {
  return getProjectRoomName(projectId);
}

/**
 * Get LiveKit server URL for client
 */
export function getLiveKitUrl(): string {
  return config.url;
}

/**
 * @alias listParticipants - Get participants in a room
 */
export async function getParticipants(roomName: string): Promise<Participant[]> {
  return listParticipants(roomName);
}

// Re-export createRoom with overloaded signature for backwards compatibility
// The server actions call createRoom(roomName, options) but the main function expects createRoom({name, ...options})
export { createRoom as createLiveKitRoom };

/**
 * Create a room with legacy signature (roomName, options)
 * This is the version used by server actions
 */
export async function createVideoRoom(
  roomName: string,
  options?: { emptyTimeout?: number; maxParticipants?: number; metadata?: string }
): Promise<Room> {
  return createRoom({
    name: roomName,
    emptyTimeout: options?.emptyTimeout,
    maxParticipants: options?.maxParticipants,
    metadata: options?.metadata,
  });
}
