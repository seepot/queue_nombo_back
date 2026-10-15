/**
 * seed-sample-clinic-tickets.js
 * Menjana beberapa tiket contoh bagi menguji aliran klinik secara langsung.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: { categories: true },
  });

  for (const branch of branches) {
    const catReg = branch.categories.find((c) => c.prefixCode === "A");
    const catDoctor = branch.categories.find((c) => c.prefixCode === "B");
    const catPharm = branch.categories.find((c) => c.prefixCode === "C");

    if (catReg && catDoctor && catPharm) {
      // 1. Pesakit sedang menunggu di Bilik Doktor (Shared Pool)
      await prisma.ticket.createMany({
        data: [
          {
            tenantId: branch.tenantId,
            branchId: branch.id,
            categoryId: catDoctor.id,
            ticketNo: "A1001",
            seqNumber: 1001,
            customerName: "En. Kamaruzzaman",
            phoneNo: "0129876543",
            status: "WAITING",
          },
          {
            tenantId: branch.tenantId,
            branchId: branch.id,
            categoryId: catDoctor.id,
            ticketNo: "A1002",
            seqNumber: 1002,
            customerName: "Pn. Faridah Ali",
            phoneNo: "0134567890",
            status: "WAITING",
          },
          {
            tenantId: branch.tenantId,
            branchId: branch.id,
            categoryId: catDoctor.id,
            ticketNo: "A1003",
            seqNumber: 1003,
            customerName: "Cik Nur Aisyah",
            phoneNo: "0178889999",
            status: "WAITING",
          },
          // 2. Pesakit di Kaunter Farmasi
          {
            tenantId: branch.tenantId,
            branchId: branch.id,
            categoryId: catPharm.id,
            ticketNo: "A1000",
            seqNumber: 1000,
            customerName: "En. Tan Ah Kow",
            phoneNo: "0192223333",
            status: "WAITING",
          },
        ],
      });
      console.log(`✅ 4 Tiket Contoh Dijana bagi cawangan ${branch.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
