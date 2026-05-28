import type { NextRequest } from "next/server";
import { jsonError, jsonOk, requireRigAuth } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = requireRigAuth(request);
    const ssoConfigured = Boolean(process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID);
    return jsonOk({
      status: "ok",
      product: "RIG Prompt Master",
      auth,
      sso: {
        configured: ssoConfigured,
        issuer: process.env.OIDC_ISSUER || null,
        mode: ssoConfigured ? "oidc-ready" : "local-dev",
      },
      apiKey: {
        configured: Boolean(process.env.RIG_API_KEY),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
