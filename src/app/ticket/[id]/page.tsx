import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TicketClient from "./TicketClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { branch: true },
  });

  return {
    title: ticket ? `Tiket ${ticket.ticketNo} - ${ticket.branch.name}` : "Tiket Giliran",
    description: "Pantau status nombor giliran anda secara langsung.",
  };
}

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      branch: {
        include: {
          tenant: true,
        },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  // Kira bilangan giliran di hadapan
  let waitingAhead = 0;
  if (ticket.status === "WAITING") {
    waitingAhead = await prisma.ticket.count({
      where: {
        branchId: ticket.branchId,
        categoryId: ticket.categoryId,
        status: "WAITING",
        createdAt: { lt: ticket.createdAt },
      },
    });
  }

  const estimatedMinutes = (waitingAhead + 1) * ticket.category.estimatedMinutes;

  const initialTicket = {
    id: ticket.id,
    ticketNo: ticket.ticketNo,
    status: ticket.status,
    counterNo: ticket.counterNo,
    categoryName: ticket.category.name,
    branchName: ticket.branch.name,
    tenantName: ticket.branch.tenant.name,
    waitingAhead,
    estimatedMinutes,
    calledAt: ticket.calledAt ? ticket.calledAt.toISOString() : null,
    completedAt: ticket.completedAt ? ticket.completedAt.toISOString() : null,
    createdAt: ticket.createdAt.toISOString(),
  };

  return <TicketClient initialTicket={initialTicket} />;
}
