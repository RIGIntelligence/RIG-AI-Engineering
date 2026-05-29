import PromptMasterApp from "@/components/prompt-master-app";
import { getV15Catalog } from "@/lib/catalog";
import { getStoreSnapshot } from "@/lib/store";
import { getV10Readiness } from "@/lib/v10-readiness";
import { getV25Audit } from "@/lib/v25-audit";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [catalog, store] = await Promise.all([getV15Catalog(), getStoreSnapshot()]);
  return <PromptMasterApp audit={getV25Audit()} catalog={catalog} initialStore={store} readiness={getV10Readiness()} />;
}
