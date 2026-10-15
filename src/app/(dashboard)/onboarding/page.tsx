import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Persediaan Awal Cawangan | QueNombo SaaS",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId;

  let tenant = null;

  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        branches: {
          include: {
            categories: { orderBy: { sortOrder: "asc" } },
            counters: { orderBy: { counterNo: "asc" } },
          },
        },
      },
    });
  } else if (user.role === "SUPERADMIN") {
    // Fallback untuk SuperAdmin agar boleh melihat tetapan premis contoh
    tenant = await prisma.tenant.findFirst({
      include: {
        branches: {
          include: {
            categories: { orderBy: { sortOrder: "asc" } },
            counters: { orderBy: { counterNo: "asc" } },
          },
        },
      },
    });
  }

  if (!tenant) {
    redirect("/superadmin");
  }

  const branch = tenant.branches[0];

  if (!branch) {
    redirect(user.role === "SUPERADMIN" ? "/superadmin" : "/dashboard");
  }

  const branchInfo = {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    phone: branch.phone,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    categories: branch.categories.map((c) => ({
      id: c.id,
      name: c.name,
      prefixCode: c.prefixCode,
      startNumber: c.startNumber,
    })),
    counters: branch.counters.map((c) => ({
      id: c.id,
      counterNo: c.counterNo,
      name: c.name,
      zone: c.zone,
    })),
  };

  return <OnboardingClient branch={branchInfo} />;
}
