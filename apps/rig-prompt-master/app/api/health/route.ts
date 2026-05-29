import { NextResponse } from "next/server";
import { getV15Catalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const catalog = await getV15Catalog();
  return NextResponse.json({
    status: "ok",
    product: "RIG Master Prompter",
    version: "15.6.0",
    catalogStatus: catalog.status,
    generatedUtc: new Date().toISOString(),
  });
}
