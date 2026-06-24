import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
} from "jose";
import { requireEnv } from "@/lib/supabase/env";

export const WALLET_ACCESS_COOKIE = "wallet_access_token";
export const WALLET_REFRESH_COOKIE = "wallet_refresh_token";
export const WALLET_ADDRESS_HEADER = "x-wallet-address";

const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60; // 7 days

export interface WalletAccessClaims extends JWTPayload {
  walletAddress: string;
  type: "access";
}

export interface WalletRefreshClaims extends JWTPayload {
  walletAddress: string;
  type: "refresh";
  jti: string;
}

function getJwtSecret(): Uint8Array {
  const secret = requireEnv("WALLET_JWT_SECRET").trim();
  return new TextEncoder().encode(secret);
}

export function getAccessTokenMaxAgeSec(): number {
  return ACCESS_TOKEN_TTL_SEC;
}

export function getRefreshTokenMaxAgeSec(): number {
  return REFRESH_TOKEN_TTL_SEC;
}

export async function signWalletAccessToken(
  walletAddress: string,
): Promise<string> {
  return new SignJWT({ walletAddress, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SEC}s`)
    .sign(getJwtSecret());
}

export async function signWalletRefreshToken(
  walletAddress: string,
  jti: string,
): Promise<string> {
  return new SignJWT({ walletAddress, type: "refresh", jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SEC}s`)
    .sign(getJwtSecret());
}

export async function verifyWalletAccessToken(
  token: string,
): Promise<WalletAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (payload.type !== "access" || typeof payload.walletAddress !== "string") {
      return null;
    }
    return payload as WalletAccessClaims;
  } catch {
    return null;
  }
}

export async function verifyWalletRefreshToken(
  token: string,
): Promise<WalletRefreshClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });
    if (
      payload.type !== "refresh" ||
      typeof payload.walletAddress !== "string" ||
      typeof payload.jti !== "string"
    ) {
      return null;
    }
    return payload as WalletRefreshClaims;
  } catch {
    return null;
  }
}

export function createRefreshTokenId(): string {
  return crypto.randomUUID();
}
