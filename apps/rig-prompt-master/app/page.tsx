import PromptMasterApp from "@/components/prompt-master-app";
import { getV15Catalog } from "@/lib/catalog";
import { getStoreSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [catalog, store] = await Promise.all([getV15Catalog(), getStoreSnapshot()]);
  return <PromptMasterApp catalog={catalog} initialStore={store} />;
}
