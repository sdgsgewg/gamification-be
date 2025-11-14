// utils/cookieHelper.ts
import { Response } from "express";

const isProd = process.env.NODE_ENV === "production";

interface CookieOptions {
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
}

/**
 * Generate consistent cookie options for refresh token
 */
export const getRefreshTokenCookieOptions = (maxAge?: number): CookieOptions => {
  const baseOptions: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...(isProd && process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };

  if (maxAge) baseOptions.maxAge = maxAge;

  return baseOptions;
};

/**
 * Set refresh token cookie
 */
export const setRefreshTokenCookie = (res: Response, token: string, maxAge?: number) => {
  res.cookie("refresh_token", token, getRefreshTokenCookieOptions(maxAge));
};

/**
 * Clear refresh token cookie
 */
export const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie("refresh_token", getRefreshTokenCookieOptions());
};
