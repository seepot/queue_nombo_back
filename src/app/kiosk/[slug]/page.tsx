import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import KioskClient from "./KioskClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  return {
    title: tenant ? `Kiosk Pendaftaran - ${tenant.name}` : "Kiosk Pendaftaran",
    description: "Ambil nombor giliran anda di kiosk skrin sentuh QueNombo.",
  };
}

export default async function KioskPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: {
      branches: {
        include: {
          categories: {
            where: { status: "ACTIVE" },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!tenant || tenant.branches.length === 0) {
    notFound();
  }

  const branch = tenant.branches[0];

  // Ambil bilangan menunggu bagi setiap kategori
  const categoriesWithCounts = await Promise.all(
    branch.categories.map(async (c) => {
      const waitingCount = await prisma.ticket.count({
        where: {
          branchId: branch.id,
          categoryId: c.id,
          status: "WAITING",
        },
      });

      return {
        id: c.id,
        name: c.name,
        prefixCode: c.prefixCode,
        estimatedMinutes: c.estimatedMinutes,
        waitingCount,
      };
    })
  );

  const kioskData = {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    categories: categoriesWithCounts,
  };

  return <KioskClient branch={kioskData} />;
}
