import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppointmentClient from "./AppointmentClient";

export const metadata = {
  title: "Pengurusan Temujanji Maya | QueNombo SaaS",
};

export default async function AppointmentsPage() {
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
      include: { branches: { take: 1 } },
    });
  } else {
    // Fallback untuk SuperAdmin: gunakan tenant pertama yang aktif
    tenant = await prisma.tenant.findFirst({
      include: { branches: { take: 1 } },
    });
    tenantId = tenant?.id;
  }

  const branch = tenant?.branches[0];

  const rawAppointments = await prisma.appointment.findMany({
    where: {
      ...(user.role !== "SUPERADMIN" && tenantId ? { tenantId } : {}),
      ...(branch ? { branchId: branch.id } : {}),
    },
    include: {
      category: true,
    },
    orderBy: [{ appointmentDate: "desc" }, { timeSlot: "asc" }],
    take: 100,
  });

  const appointments = rawAppointments.map((a) => ({
    id: a.id,
    customerName: a.customerName,
    customerPhone: a.customerPhone,
    customerEmail: a.customerEmail,
    appointmentDate: a.appointmentDate.toISOString(),
    timeSlot: a.timeSlot,
    status: a.status,
    categoryName: a.category.name,
    ticketId: a.ticketId,
    notes: a.notes,
  }));

  return (
    <AppointmentClient
      appointments={appointments}
      branchName={branch?.name || "Cawangan Utama"}
      tenantSlug={tenant?.slug || "demo"}
    />
  );
}
