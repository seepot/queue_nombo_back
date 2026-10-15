import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintPosterClient from "./PrintPosterClient";

export async function generateMetadata({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { tenant: true },
  });

  return {
    title: branch ? `Poster QR - ${branch.name}` : "Cetak Poster QR",
  };
}

export default async function PrintQrPage({ params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { tenant: true },
  });

  if (!branch) {
    notFound();
  }

  const branchData = {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    tenantName: branch.tenant.name,
    tenantSlug: branch.tenant.slug,
  };

  return <PrintPosterClient branch={branchData} />;
}
