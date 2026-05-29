import PromptMasterApp from "@/components/prompt-master-app";
import { getAudienceDoneModel } from "@/lib/audience-done-model";
import { getV15Catalog } from "@/lib/catalog";
import { getConnectorStatuses } from "@/lib/connectors";
import { getHardeningModel } from "@/lib/hardening-model";
import { getStoreSnapshot } from "@/lib/store";
import { getV10Readiness } from "@/lib/v10-readiness";
import { getV25Audit } from "@/lib/v25-audit";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [catalog, connectorStatuses, store] = await Promise.all([getV15Catalog(), getConnectorStatuses(), getStoreSnapshot()]);
  return (
    <PromptMasterApp
      audienceDoneModel={getAudienceDoneModel()}
      audit={getV25Audit()}
      catalog={catalog}
      connectorStatuses={connectorStatuses}
      hardening={getHardeningModel()}
      initialStore={store}
      readiness={getV10Readiness()}
    />
  );
}
