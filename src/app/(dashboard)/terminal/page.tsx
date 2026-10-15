import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TerminalClient from "./TerminalClient";

export const metadata = {
  title: "Terminal Panggilan Kaunter | SmartQ Cloud",
};

export default async function TerminalPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  let branchId = user.branchId;

  // Jika admin tiada branchId tetap, ambil branch pertama
  if (!branchId) {
    const firstBranch = await prisma.branch.findFirst({
      where: {
        ...(user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });
    branchId = firstBranch?.id || null;
  }

  if (!branchId) {
    return (
      <div className="p-8 text-center text-gray-600">
        <h2 className="text-xl font-bold">Cawangan Tidak Ditemui</h2>
        <p className="text-sm mt-1">Sila hubungi pentadbir untuk menetapkan cawangan akaun anda.</p>
      </div>
    );
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: {
      categories: {
        where: { status: "ACTIVE" },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  // Dapatkan tiket yang sedang dipanggil / dilayan di kaunter pengguna ini jika ada
  const currentTicket = await prisma.ticket.findFirst({
    where: {
      branchId,
      status: { in: ["CALLING", "SERVING", "RECALLED"] },
      ...(user.counterNo ? { counterNo: user.counterNo } : {}),
    },
    include: { category: true },
    orderBy: { calledAt: "desc" },
  });

  // Dapatkan senarai giliran menunggu hari ini
  const waitingTicketsRaw = await prisma.ticket.findMany({
    where: {
      branchId,
      status: "WAITING",
    },
    include: { category: true },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const waitingTickets = waitingTicketsRaw.map((w) => ({
    id: w.id,
    ticketNo: w.ticketNo,
    categoryName: w.category.name,
    customerName: w.customerName || null,
    createdAt: w.createdAt.toISOString(),
  }));

  const initialServing = currentTicket
    ? {
        id: currentTicket.id,
        ticketNo: currentTicket.ticketNo,
        counterNo: currentTicket.counterNo || user.counterNo || "1",
        categoryName: currentTicket.category.name,
        callCount: currentTicket.callCount,
        servedAt: currentTicket.calledAt ? currentTicket.calledAt.toISOString() : null,
      }
    : null;

  return (
    <TerminalClient
      branchId={branchId}
      branchName={branch?.name || "Cawangan Utama"}
      counterNo={user.counterNo || "1"}
      counterId={user.counterId || ""}
      initialServing={initialServing}
      waitingTickets={waitingTickets}
      categories={branch?.categories || []}
    />
  );
}
