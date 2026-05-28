import type { NextRequest } from "next/server";
import { ApiError, jsonError, jsonOk, requireRigAuth } from "@/lib/http";
import { getStoreSnapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireRigAuth(request);
    const { id } = await context.params;
    const data = await getStoreSnapshot();
    const proofPacket = data.proofPackets.find((packet) => packet.id === id);
    if (!proofPacket) {
      throw new ApiError(404, "proof_packet_not_found", `ProofPacket ${id} was not found.`);
    }
    return jsonOk(proofPacket);
  } catch (error) {
    return jsonError(error);
  }
}
