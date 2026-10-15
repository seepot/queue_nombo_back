import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import ReceiptClient from "./ReceiptClient";

export const metadata = {
  title: "Invois & Resit Rasmi Langganan | QueNombo SaaS",
  description: "Papar dan cetak resit rasmi pembayaran langganan QueNombo.",
};

export default async function InvoiceReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const tenantId = user.tenantId;

  const transaction = await prisma.paymentTransaction.findUnique({
    where: { id },
    include: {
      tenant: true,
      subscription: true,
    },
  });

  if (!transaction) {
    notFound();
  }

  // Jika bukan superadmin, pastikan transaksi milik tenant semasa
  if (user.role !== "SUPERADMIN" && transaction.tenantId !== tenantId) {
    redirect("/langganan");
  }

  return (
    <ReceiptClient
      transaction={{
        id: transaction.id,
        invoiceNo: transaction.invoiceNo,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        planType: transaction.planType,
        billingCycle: transaction.billingCycle,
        paymentMethod: transaction.paymentMethod,
        gatewayProvider: transaction.gatewayProvider,
        gatewayRef: transaction.gatewayRef,
        status: transaction.status,
        paidAt: transaction.paidAt ? transaction.paidAt.toISOString() : null,
        createdAt: transaction.createdAt.toISOString(),
        tenantName: transaction.tenant.name,
        tenantEmail: transaction.tenant.email,
        tenantPhone: transaction.tenant.phone,
      }}
    />
  );
}
