/**
 * Matrix Admin API Client
 *
 * Provides helpers for server-side Matrix operations:
 * - User provisioning via shared secret registration
 * - Room creation and management
 * - User invitations and kicks
 *
 * Requires environment variables:
 * - MATRIX_BASE_URL: Synapse server URL (e.g., http://localhost:8008)
 * - MATRIX_SERVER_NAME: Server name (e.g., localhost or matrix.example.com)
 * - MATRIX_ADMIN_ACCESS_TOKEN: Admin user access token
 * - MATRIX_SHARED_SECRET: Shared secret for user registration
 */

import { createHmac } from "crypto";

// =============================================================================
// Configuration
// =============================================================================

const config = {
  get baseUrl() {
    const url = process.env.MATRIX_BASE_URL;
    if (!url) throw new Error("MATRIX_BASE_URL is not configured");
    return url.replace(/\/$/, ""); // Remove trailing slash
  },
  get serverName() {
    const name = process.env.MATRIX_SERVER_NAME;
    if (!name) throw new Error("MATRIX_SERVER_NAME is not configured");
    return name;
  },
  get adminAccessToken() {
    const token = process.env.MATRIX_ADMIN_ACCESS_TOKEN;
    if (!token) throw new Error("MATRIX_ADMIN_ACCESS_TOKEN is not configured");
    return token;
  },
  get sharedSecret() {
    return process.env.MATRIX_SHARED_SECRET;
  },
  get adminUserId() {
    return process.env.MATRIX_ADMIN_USER_ID;
  },
};

// =============================================================================
// Types
// =============================================================================

export interface MatrixUser {
  userId: string;
  accessToken: string;
  deviceId: string;
  homeServer: string;
}

export interface MatrixRoom {
  roomId: string;
  roomAlias?: string;
}

export interface CreateUserOptions {
  username: string;
  password: string;
  displayName?: string;
  admin?: boolean;
}

export interface CreateRoomOptions {
  name?: string;
  topic?: string;
  isDirect?: boolean;
  inviteUserIds?: string[];
  preset?: "private_chat" | "trusted_private_chat" | "public_chat";
  encrypted?: boolean;
  roomAliasName?: string;
}

export interface MatrixError {
  errcode: string;
  error: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Make an authenticated request to the Matrix API
 */
async function matrixFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.adminAccessToken}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as MatrixError;
    throw new MatrixApiError(error.errcode, error.error, response.status);
  }

  return data as T;
}

/**
 * Custom error class for Matrix API errors
 */
export class MatrixApiError extends Error {
  constructor(
    public readonly errcode: string,
    public readonly matrixError: string,
    public readonly statusCode: number
  ) {
    super(`Matrix API Error [${errcode}]: ${matrixError}`);
    this.name = "MatrixApiError";
  }

  get isUserExists() {
    return this.errcode === "M_USER_IN_USE";
  }

  get isNotFound() {
    return this.errcode === "M_NOT_FOUND";
  }

  get isForbidden() {
    return this.errcode === "M_FORBIDDEN";
  }

  get isAlreadyJoined() {
    return this.errcode === "M_FORBIDDEN" && this.matrixError.includes("already in the room");
  }
}

/**
 * Generate Matrix user ID from username
 */
export function formatUserId(username: string): string {
  const sanitized = username.toLowerCase().replace(/[^a-z0-9._=-]/g, "_");
  return `@${sanitized}:${config.serverName}`;
}

/**
 * Generate a secure random password
 */
export function generatePassword(length = 32): string {
  const crypto = require("crypto");
  return crypto.randomBytes(length).toString("base64url");
}

// =============================================================================
// User Management
// =============================================================================

/**
 * Create a new Matrix user via shared secret registration
 *
 * This is the recommended way to provision users from your app.
 * Requires MATRIX_SHARED_SECRET to be configured in Synapse.
 */
export async function createUser(options: CreateUserOptions): Promise<MatrixUser> {
  const sharedSecret = config.sharedSecret;
  if (!sharedSecret) {
    throw new Error("MATRIX_SHARED_SECRET is required for user registration");
  }

  // Step 1: Get registration nonce
  const nonceResponse = await fetch(`${config.baseUrl}/_synapse/admin/v1/register`, {
    method: "GET",
  });

  if (!nonceResponse.ok) {
    throw new Error(`Failed to get registration nonce: ${nonceResponse.status}`);
  }

  const { nonce } = await nonceResponse.json();

  // Step 2: Generate HMAC
  const hmac = createHmac("sha1", sharedSecret);
  hmac.update(nonce);
  hmac.update("\x00");
  hmac.update(options.username);
  hmac.update("\x00");
  hmac.update(options.password);
  hmac.update("\x00");
  hmac.update(options.admin ? "admin" : "notadmin");
  const mac = hmac.digest("hex");

  // Step 3: Register user
  const registerResponse = await fetch(`${config.baseUrl}/_synapse/admin/v1/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nonce,
      username: options.username,
      password: options.password,
      mac,
      admin: options.admin || false,
      displayname: options.displayName,
    }),
  });

  const data = await registerResponse.json();

  if (!registerResponse.ok) {
    const error = data as MatrixError;
    throw new MatrixApiError(error.errcode, error.error, registerResponse.status);
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    deviceId: data.device_id,
    homeServer: data.home_server,
  };
}

/**
 * Login an existing Matrix user
 */
export async function loginUser(username: string, password: string): Promise<MatrixUser> {
  const response = await fetch(`${config.baseUrl}/_matrix/client/v3/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "m.login.password",
      identifier: {
        type: "m.id.user",
        user: username,
      },
      password,
      initial_device_display_name: "Kudo App",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as MatrixError;
    throw new MatrixApiError(error.errcode, error.error, response.status);
  }

  return {
    userId: data.user_id,
    accessToken: data.access_token,
    deviceId: data.device_id,
    homeServer: data.home_server,
  };
}

/**
 * Get or create a Matrix user
 * Creates if doesn't exist, returns existing credentials if login succeeds
 */
export async function getOrCreateUser(
  username: string,
  password: string,
  displayName?: string
): Promise<MatrixUser> {
  try {
    return await createUser({ username, password, displayName });
  } catch (error) {
    if (error instanceof MatrixApiError && error.isUserExists) {
      return await loginUser(username, password);
    }
    throw error;
  }
}

/**
 * Deactivate a Matrix user (Admin API)
 */
export async function deactivateUser(userId: string, erase = false): Promise<void> {
  await matrixFetch(`/_synapse/admin/v1/deactivate/${encodeURIComponent(userId)}`, {
    method: "POST",
    body: JSON.stringify({ erase }),
  });
}

/**
 * Get user info (Admin API)
 */
export async function getUser(userId: string): Promise<Record<string, unknown> | null> {
  try {
    return await matrixFetch(`/_synapse/admin/v2/users/${encodeURIComponent(userId)}`);
  } catch (error) {
    if (error instanceof MatrixApiError && error.isNotFound) {
      return null;
    }
    throw error;
  }
}

// =============================================================================
// Room Management
// =============================================================================

/**
 * Create a new Matrix room
 */
export async function createRoom(options: CreateRoomOptions = {}): Promise<MatrixRoom> {
  const requestBody: Record<string, unknown> = {
    preset: options.preset || (options.isDirect ? "trusted_private_chat" : "private_chat"),
    is_direct: options.isDirect || false,
  };

  if (options.name) {
    requestBody.name = options.name;
  }

  if (options.topic) {
    requestBody.topic = options.topic;
  }

  if (options.inviteUserIds?.length) {
    requestBody.invite = options.inviteUserIds;
  }

  if (options.roomAliasName) {
    requestBody.room_alias_name = options.roomAliasName;
  }

  // Enable E2EE by default
  if (options.encrypted !== false) {
    requestBody.initial_state = [
      {
        type: "m.room.encryption",
        state_key: "",
        content: {
          algorithm: "m.megolm.v1.aes-sha2",
        },
      },
    ];
  }

  const data = await matrixFetch<{ room_id: string; room_alias?: string }>(
    "/_matrix/client/v3/createRoom",
    {
      method: "POST",
      body: JSON.stringify(requestBody),
    }
  );

  return {
    roomId: data.room_id,
    roomAlias: data.room_alias,
  };
}

/**
 * Create a direct message room between two users
 */
export async function createDMRoom(
  userAId: string,
  userBId: string
): Promise<MatrixRoom> {
  return createRoom({
    isDirect: true,
    inviteUserIds: [userAId, userBId],
    preset: "trusted_private_chat",
    encrypted: true,
  });
}

/**
 * Create a project/group room
 */
export async function createGroupRoom(
  name: string,
  memberUserIds: string[],
  topic?: string
): Promise<MatrixRoom> {
  return createRoom({
    name,
    topic,
    inviteUserIds: memberUserIds,
    preset: "private_chat",
    encrypted: true,
  });
}

/**
 * Invite a user to a room
 */
export async function inviteUser(roomId: string, userId: string): Promise<void> {
  try {
    await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/invite`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
  } catch (error) {
    // Ignore if user is already in the room
    if (error instanceof MatrixApiError && error.isAlreadyJoined) {
      return;
    }
    throw error;
  }
}

/**
 * Kick a user from a room
 */
export async function kickUser(
  roomId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/kick`, {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      reason: reason || "Removed by admin",
    }),
  });
}

/**
 * Ban a user from a room
 */
export async function banUser(
  roomId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/ban`, {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      reason: reason || "Banned by admin",
    }),
  });
}

/**
 * Unban a user from a room
 */
export async function unbanUser(roomId: string, userId: string): Promise<void> {
  await matrixFetch(`/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/unban`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

/**
 * Set room name
 */
export async function setRoomName(roomId: string, name: string): Promise<void> {
  await matrixFetch(
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.name`,
    {
      method: "PUT",
      body: JSON.stringify({ name }),
    }
  );
}

/**
 * Set room topic
 */
export async function setRoomTopic(roomId: string, topic: string): Promise<void> {
  await matrixFetch(
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/state/m.room.topic`,
    {
      method: "PUT",
      body: JSON.stringify({ topic }),
    }
  );
}

/**
 * Get room members
 */
export async function getRoomMembers(
  roomId: string
): Promise<Array<{ userId: string; membership: string; displayName?: string }>> {
  const data = await matrixFetch<{ joined: Record<string, { display_name?: string }> }>(
    `/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/joined_members`
  );

  return Object.entries(data.joined).map(([userId, info]) => ({
    userId,
    membership: "join",
    displayName: info.display_name,
  }));
}

/**
 * Delete a room (Admin API - actually just removes all members and aliases)
 */
export async function deleteRoom(
  roomId: string,
  options: { purge?: boolean; message?: string } = {}
): Promise<void> {
  await matrixFetch(`/_synapse/admin/v2/rooms/${encodeURIComponent(roomId)}`, {
    method: "DELETE",
    body: JSON.stringify({
      purge: options.purge ?? true,
      message: options.message || "Room deleted by admin",
    }),
  });
}

// =============================================================================
// Health & Info
// =============================================================================

/**
 * Check if Matrix server is healthy
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${config.baseUrl}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get Matrix server version info
 */
export async function getServerVersion(): Promise<Record<string, unknown>> {
  const response = await fetch(`${config.baseUrl}/_matrix/client/versions`);
  return response.json();
}

/**
 * Get configuration for client-side SDK
 */
export function getClientConfig() {
  return {
    baseUrl: config.baseUrl,
    serverName: config.serverName,
  };
}

// =============================================================================
// Compatibility Aliases (for server actions)
// =============================================================================

/**
 * @alias createUser - Legacy function name for server actions
 */
export async function createMatrixUser(
  username: string,
  password: string,
  displayName?: string
): Promise<{ user_id: string; access_token: string; device_id: string }> {
  const result = await createUser({ username, password, displayName });
  // Return in legacy format expected by server actions
  return {
    user_id: result.userId,
    access_token: result.accessToken,
    device_id: result.deviceId,
  };
}

/**
 * @alias createRoom - Legacy function name for server actions
 */
export async function createMatrixRoom(options: CreateRoomOptions): Promise<string> {
  const result = await createRoom(options);
  return result.roomId;
}

/**
 * @alias inviteUser - Legacy function name for server actions
 */
export async function inviteToRoom(roomId: string, userId: string): Promise<void> {
  return inviteUser(roomId, userId);
}

/**
 * @alias formatUserId - Generate Matrix user ID from handle
 */
export function generateMatrixUserId(handle: string): string {
  return formatUserId(handle);
}

/**
 * @alias generatePassword - Generate secure password for Matrix user
 */
export function generateMatrixPassword(): string {
  return generatePassword();
}

/**
 * Get Matrix homeserver URL
 */
export function getMatrixHomeserverUrl(): string {
  return config.baseUrl;
}

/**
 * Get Matrix server name
 */
export function getMatrixServerName(): string {
  return config.serverName;
}
