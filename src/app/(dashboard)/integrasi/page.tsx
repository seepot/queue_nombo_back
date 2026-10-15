import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import IntegrationClient from "./IntegrationClient";

export const metadata = {
  title: "Integrasi & WhatsApp Gateway | QueNombo SaaS",
};

export default async function IntegrationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  let tenantId = user.tenantId;

  let tenant = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          take: 1,
        },
      },
    });
  } else {
    // Fallback untuk SuperAdmin
    tenant = await prisma.tenant.findFirst({
      include: {
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIAL"] } },
          take: 1,
        },
      },
    });
    tenantId = tenant?.id;
  }

  const subscription = tenant?.subscriptions[0];
  const settings = (tenant?.settings as any) || {};

  return (
    <IntegrationClient
      tenantId={tenantId || "demo-tenant-id"}
      tenantName={tenant?.name || "Organisasi Utama (Superadmin View)"}
      initialSettings={settings}
      whatsappQuota={subscription?.whatsappQuota || 300}
      whatsappUsed={subscription?.whatsappUsed || 0}
    />
  );
}
