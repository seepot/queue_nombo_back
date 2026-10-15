import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ScanClient from "./ScanClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    include: { branches: { take: 1 } },
  });

  return {
    title: tenant ? `Ambil Giliran - ${tenant.name}` : "Ambil Giliran",
    description: "Ambil nombor giliran maya anda secara langsung dari telefon pintar.",
  };
}

export default async function ScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // 1. Cari sama ada slug merujuk kepada Tenant Slug atau Branch Code
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

  // Kira jumlah orang menunggu untuk setiap kategori dalam cawangan ini
  const categoriesWithCounts = await Promise.all(
    branch.categories.map(async (cat) => {
      const waitingCount = await prisma.ticket.count({
        where: {
          branchId: branch.id,
          categoryId: cat.id,
          status: "WAITING",
        },
      });

      return {
        id: cat.id,
        name: cat.name,
        prefixCode: cat.prefixCode,
        startNumber: cat.startNumber,
        estimatedMinutes: cat.estimatedMinutes,
        waitingCount,
      };
    })
  );

  const branchData = {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    categories: categoriesWithCounts,
  };

  return <ScanClient branch={branchData} />;
}
