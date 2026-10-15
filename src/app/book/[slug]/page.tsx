import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingClient from "./BookingClient";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
  });

  return {
    title: tenant ? `Tempah Temujanji - ${tenant.name}` : "Tempah Temujanji",
    description: "Tempah slot masa temujanji anda secara pantas dengan QueNombo.",
  };
}

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
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

  const branchInfo = {
    id: branch.id,
    name: branch.name,
    code: branch.code,
    address: branch.address,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    categories: branch.categories.map((c) => ({
      id: c.id,
      name: c.name,
      prefixCode: c.prefixCode,
    })),
  };

  return <BookingClient branch={branchInfo} />;
}
