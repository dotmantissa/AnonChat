import { NextResponse } from "next/server";
import {
  createRefreshTokenId,
  signWalletAccessToken,
  signWalletRefreshToken,
} from "@/lib/auth/wallet-jwt";
import { storeRefreshToken } from "@/lib/auth/wallet-refresh-store";
import { setWalletAuthCookies } from "@/lib/auth/wallet-jwt-cookies";

export async function buildWalletAuthResponse(
  walletAddress: string,
  body: Record<string, unknown>,
  status: number,
): Promise<NextResponse> {
  const jti = createRefreshTokenId();
  const [accessToken, refreshToken] = await Promise.all([
    signWalletAccessToken(walletAddress),
    signWalletRefreshToken(walletAddress, jti),
  ]);

  await storeRefreshToken(jti, walletAddress);

  const response = NextResponse.json(body, { status });
  setWalletAuthCookies(response, accessToken, refreshToken);
  return response;
}
