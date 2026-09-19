import { Router } from "express";
import crypto from "node:crypto";
import type { CookieOptions } from "express";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import type { AuthUser } from "@codeatlas/shared";

const router = Router();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

function getCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  };
}

router.get("/github", (_req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  res.cookie("oauth_state", state, { ...getCookieOptions(), maxAge: 5 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: requireEnv("GITHUB_CLIENT_ID"),
    redirect_uri: requireEnv("GITHUB_CALLBACK_URL"),
    scope: "repo",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get("/github/callback", async (req, res) => {
  const { code, state } = req.query;
  const savedState = req.cookies?.oauth_state as string | undefined;
  const cookieOptions = getCookieOptions();
  const CLIENT_URL = process.env.CLIENT_URL ?? "http://localhost:5173";
  res.clearCookie("oauth_state", cookieOptions);

  if (!code || typeof code !== "string" || !state || state !== savedState) {
    res.redirect(`${CLIENT_URL}?error=invalid_state`);
    return;
  }

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: requireEnv("GITHUB_CLIENT_ID"),
        client_secret: requireEnv("GITHUB_CLIENT_SECRET"),
        code,
        redirect_uri: requireEnv("GITHUB_CALLBACK_URL"),
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
    };

    if (!tokenData.access_token) {
      console.error("GitHub token exchange failed:", tokenData);
      res.redirect(`${CLIENT_URL}?error=token_exchange_failed`);
      return;
    }

    const githubAccessToken = tokenData.access_token;

    const profileRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
        Accept: "application/vnd.github+json",
      },
    });
    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      avatar_url: string;
    };

    const user = await User.findOneAndUpdate(
      { githubId: profile.id },
      {
        githubId: profile.id,
        username: profile.login,
        avatarUrl: profile.avatar_url,
        githubAccessToken,
      },
      { upsert: true, new: true }
    );

    const token = signToken({ userId: user._id.toString() });
    res.cookie("token", token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.redirect(CLIENT_URL);
  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    res.redirect(`${CLIENT_URL}?error=server_error`);
  }
});

router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const body: AuthUser = {
    id: user._id.toString(),
    githubId: user.githubId,
    username: user.username,
    avatarUrl: user.avatarUrl,
  };
  res.json(body);
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", getCookieOptions());
  res.json({ success: true });
});

export default router;