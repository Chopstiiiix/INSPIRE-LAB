/**
 * Matrix User Provisioning
 *
 * Handles automatic Matrix account creation when platform users become ACTIVE.
 * Uses a secure approach: passwords are stored encrypted, tokens generated on-demand.
 *
 * Flow:
 * 1. User completes onboarding -> provisionMatrixUser() is called
 * 2. Creates Matrix user via Synapse Admin API with random password
 * 3. Stores matrixUserId on User, encrypted password in UserMatrixCredentials
 * 4. When user requests token -> loginAndGetToken() generates fresh access token
 */

import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  createUser,
  loginUser,
  formatUserId,
  generatePassword,
  getUser,
  MatrixApiError,
} from "./admin";

// =============================================================================
// Types
// =============================================================================

export interface ProvisioningResult {
  success: boolean;
  matrixUserId?: string;
  error?: string;
}

export interface TokenResult {
  success: boolean;
  accessToken?: string;
  userId?: string;
  homeserverUrl?: string;
  error?: string;
}

// =============================================================================
// User Provisioning
// =============================================================================

/**
 * Provision a Matrix user for a platform user.
 * Called when user completes onboarding and becomes ACTIVE.
 *
 * @param userId - Platform user ID
 * @param handle - User's handle (used for Matrix username)
 * @param displayName - Optional display name
 */
export async function provisionMatrixUser(
  userId: string,
  handle: string,
  displayName?: string
): Promise<ProvisioningResult> {
  // Check if already provisioned
  const existingCreds = await prisma.userMatrixCredentials.findUnique({
    where: { userId },
  });

  if (existingCreds) {
    return {
      success: true,
      matrixUserId: existingCreds.matrixUserId,
    };
  }

  const matrixUserId = formatUserId(handle);
  const password = generatePassword(48); // Strong 48-char password

  try {
    // Check if Matrix user already exists (edge case: re-provisioning)
    const existingUser = await getUser(matrixUserId);

    if (!existingUser) {
      // Create new Matrix user
      await createUser({
        username: handle.toLowerCase(),
        password,
        displayName: displayName || handle,
        admin: false,
      });
    }

    // Store credentials (password encrypted)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { matrixUserId },
      }),
      prisma.userMatrixCredentials.create({
        data: {
          userId,
          matrixUserId,
          password: encrypt(password),
        },
      }),
    ]);

    return {
      success: true,
      matrixUserId,
    };
  } catch (error) {
    // Handle case where user already exists in Matrix
    if (error instanceof MatrixApiError && error.isUserExists) {
      // User exists, try to login with a new password and update
      // This shouldn't happen in normal flow, log for investigation
      console.error(
        `[Matrix Provisioning] User ${matrixUserId} already exists but no credentials stored. Manual intervention may be needed.`
      );
      return {
        success: false,
        error: "Matrix user exists but credentials not found. Please contact support.",
      };
    }

    console.error("[Matrix Provisioning] Failed to provision user:", error);
    return {
      success: false,
      error: "Failed to create chat account. Please try again later.",
    };
  }
}

/**
 * Check if a user has Matrix credentials provisioned
 */
export async function hasMatrixCredentials(userId: string): Promise<boolean> {
  const creds = await prisma.userMatrixCredentials.findUnique({
    where: { userId },
    select: { id: true },
  });
  return creds !== null;
}

// =============================================================================
// Token Generation (On-Demand)
// =============================================================================

/**
 * Login to Matrix and get a fresh access token for a user.
 * This is the secure approach: tokens are generated on-demand, not stored.
 *
 * @param userId - Platform user ID
 */
export async function loginAndGetToken(userId: string): Promise<TokenResult> {
  // Get user and credentials
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      status: true,
      handle: true,
      matrixUserId: true,
      matrixCredentials: true,
    },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.status !== "ACTIVE") {
    return { success: false, error: "Account is not active" };
  }

  if (!user.matrixCredentials) {
    // Try to provision if not done yet (edge case: user became ACTIVE before migration)
    if (user.handle) {
      const provisioned = await provisionMatrixUser(userId, user.handle, user.handle);
      if (!provisioned.success) {
        return { success: false, error: provisioned.error };
      }
      // Fetch credentials again
      const newCreds = await prisma.userMatrixCredentials.findUnique({
        where: { userId },
      });
      if (!newCreds) {
        return { success: false, error: "Failed to initialize chat" };
      }
      user.matrixCredentials = newCreds;
    } else {
      return { success: false, error: "Chat not initialized. Please complete your profile." };
    }
  }

  try {
    // Decrypt password and login
    const password = decrypt(user.matrixCredentials.password);

    const loginResult = await loginUser(
      user.handle || user.matrixCredentials.matrixUserId.split(":")[0].slice(1),
      password
    );

    // Note: We intentionally don't log the token
    return {
      success: true,
      accessToken: loginResult.accessToken,
      userId: loginResult.userId,
      homeserverUrl: process.env.MATRIX_BASE_URL,
    };
  } catch (error) {
    console.error("[Matrix Token] Login failed for user:", userId);
    // Don't log the actual error details as they might contain sensitive info
    return {
      success: false,
      error: "Failed to authenticate with chat server",
    };
  }
}

// =============================================================================
// Migration Helper
// =============================================================================

/**
 * Provision Matrix users for all ACTIVE users who don't have credentials.
 * Use this for migration after enabling Matrix integration.
 *
 * @param batchSize - Number of users to process at once
 */
export async function migrateExistingUsers(batchSize = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Find ACTIVE users without Matrix credentials
  const usersToMigrate = await prisma.user.findMany({
    where: {
      status: "ACTIVE",
      handle: { not: null },
      matrixUserId: null,
    },
    select: {
      id: true,
      handle: true,
      name: true,
    },
    take: batchSize,
  });

  for (const user of usersToMigrate) {
    if (!user.handle) continue;

    processed++;
    const result = await provisionMatrixUser(
      user.id,
      user.handle,
      user.name || user.handle
    );

    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }

    // Small delay between users to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { processed, succeeded, failed };
}
