import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PrintSlipClient from "./PrintSlipClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
  });

  return {
    title: ticket ? `Cetak Slip - ${ticket.ticketNo}` : "Cetak Slip Giliran",
  };
}

export default async function PrintTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      branch: {
        include: { tenant: true },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Kira giliran di hadapan
  const waitingAhead = await prisma.ticket.count({
    where: {
      branchId: ticket.branchId,
      categoryId: ticket.categoryId,
      status: "WAITING",
      createdAt: { lt: ticket.createdAt },
    },
  });

  const estimatedMinutes = Math.max(1, (waitingAhead + 1) * (ticket.category?.estimatedMinutes || 5));

  const ticketData = {
    ticketId: ticket.id,
    ticketNo: ticket.ticketNo,
    categoryName: ticket.category.name,
    branchName: ticket.branch.name,
    tenantName: ticket.branch.tenant.name,
    waitingAhead,
    estimatedMinutes,
    createdAt: ticket.createdAt.toISOString(),
  };

  return <PrintSlipClient ticket={ticketData} />;
}
