const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runOfflineSyncTest() {
  console.log("==================================================================");
  console.log("  🛡️ MENJALANKAN UJIAN KETAHANAN LUAR TALIAN & PENYEGERAKAN AWAN FASA 19");
  console.log("==================================================================\n");

  // 1. Cari Cawangan dan Kategori sedia ada
  const branch = await prisma.branch.findFirst({
    include: {
      categories: true,
      tenant: true,
    },
  });

  if (!branch || branch.categories.length === 0) {
    throw new Error("❌ Tiada cawangan/kategori ditemui untuk ujian.");
  }

  const category = branch.categories[0];
  console.log(`[1/4] 🏢 Menguji di Cawangan: '${branch.name}' (Kategori: '${category.name}' [${category.prefixCode}])...`);

  const offlineTickets = [
    {
      id: `off_${Date.now()}_1`,
      ticketNo: `${category.prefixCode}9901`,
      seqNumber: 9901,
      branchId: branch.id,
      categoryId: category.id,
      categoryName: category.name,
      phoneNo: "01122334455",
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      source: "OFFLINE_KIOSK",
    },
    {
      id: `off_${Date.now()}_2`,
      ticketNo: `${category.prefixCode}9902`,
      seqNumber: 9902,
      branchId: branch.id,
      categoryId: category.id,
      categoryName: category.name,
      phoneNo: "0199887766",
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      source: "OFFLINE_KIOSK",
    },
  ];

  console.log(`  📦 Penampan luar talian menjana ${offlineTickets.length} tiket semasa tiada internet:`);
  offlineTickets.forEach((t) => console.log(`     - Tiket: ${t.ticketNo} | Waktu: ${t.createdAt}`));

  console.log("\n[2/4] ⚡ Menyegerakkan kelompok tiket luar talian ke pangkalan data PostgreSQL...");

  const syncedIds = [];

  await prisma.$transaction(async (tx) => {
    for (const item of offlineTickets) {
      const created = await tx.ticket.create({
        data: {
          tenantId: branch.tenantId,
          branchId: item.branchId,
          categoryId: item.categoryId,
          ticketNo: item.ticketNo,
          seqNumber: item.seqNumber,
          phoneNo: item.phoneNo,
          status: "WAITING",
          requestType: "KIOSK",
          createdAt: new Date(item.createdAt),
        },
      });

      syncedIds.push(item.id);
    }

    await tx.auditLog.create({
      data: {
        tenantId: branch.tenantId,
        action: "OFFLINE_BATCH_SYNC",
        details: { syncedCount: syncedIds.length, tickets: offlineTickets.map((t) => t.ticketNo) },
        status: "SUCCESS",
      },
    });
  });

  console.log(`  ✅ ${syncedIds.length} tiket berjaya diselaraskan ke dalam PostgreSQL.`);

  console.log("\n[3/4] 🛡️ Mengesahkan rekod tiket dalam PostgreSQL...");
  const verifyTickets = await prisma.ticket.findMany({
    where: {
      ticketNo: { in: offlineTickets.map((t) => t.ticketNo) },
      branchId: branch.id,
    },
  });

  console.log(`  ✅ Disahkan ${verifyTickets.length} tiket wujud dengan status: ${verifyTickets[0].status}`);

  console.log("\n[4/4] 🧹 Membersihkan data ujian...");
  await prisma.ticket.deleteMany({
    where: {
      ticketNo: { in: offlineTickets.map((t) => t.ticketNo) },
      branchId: branch.id,
    },
  });
  console.log("  ✅ Data ujian penyegerakan berjaya dibersihkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PENYEGERAKAN LUAR TALIAN FASA 19 LULUS DENGAN CEMERLANG!");
  console.log("==================================================================\n");
}

runOfflineSyncTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Offline Sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
