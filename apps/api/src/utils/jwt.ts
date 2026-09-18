import jwt from "jsonwebtoken";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment variables`);
  }
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export interface TokenPayload {
  userId: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string" || !("userId" in decoded)) {
    throw new Error("Invalid token payload");
  }

  return decoded as TokenPayload;
}