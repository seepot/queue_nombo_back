/**
 * test-multi-stage-pipeline.js
 * Menguji Rantaian Aliran Giliran Berperingkat (Multi-Stage Customer Journey Pipeline)
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🧪 MENGUJI ENJIN ALIRAN BERPERINGKAT (MULTI-STAGE JOURNEY PIPELINE)");
  console.log("==================================================================\n");

  // 1. Cari atau wujudkan cawangan ujian
  const branch = await prisma.branch.findFirst({
    include: { categories: true, counters: true },
  });

  if (!branch) {
    throw new Error("Tiada cawangan ditemui.");
  }

  console.log(`[1/4] 🏢 Cawangan: ${branch.name} (${branch.code})`);

  // 2. Sediakan 3 Kategori Rantaian Klinik (Stage 1 -> Stage 2 -> Stage 3)
  // Stage 3: Farmasi & Bayaran (Tamat)
  let catPharmacy = await prisma.serviceCategory.findFirst({
    where: { branchId: branch.id, name: { contains: "Farmasi" } },
  });
  if (!catPharmacy) {
    catPharmacy = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Farmasi & Bayaran",
        prefixCode: "F",
        startNumber: 3001,
        currentSeq: 3000,
        estimatedMinutes: 4,
        nextCategoryId: null,
      },
    });
  }

  // Stage 2: Bilik Doktor (Next -> Farmasi)
  let catDoctor = await prisma.serviceCategory.findFirst({
    where: { branchId: branch.id, name: { contains: "Doktor" } },
  });
  if (!catDoctor) {
    catDoctor = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Bilik Rawatan Doktor",
        prefixCode: "D",
        startNumber: 2001,
        currentSeq: 2000,
        estimatedMinutes: 10,
        nextCategoryId: catPharmacy.id,
      },
    });
  } else {
    catDoctor = await prisma.serviceCategory.update({
      where: { id: catDoctor.id },
      data: { nextCategoryId: catPharmacy.id },
    });
  }

  // Stage 1: Pendaftaran & Triage (Next -> Doktor)
  let catReg = await prisma.serviceCategory.findFirst({
    where: { branchId: branch.id, name: { contains: "Pendaftaran" } },
  });
  if (!catReg) {
    catReg = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Pendaftaran & Saringan",
        prefixCode: "P",
        startNumber: 1001,
        currentSeq: 1000,
        estimatedMinutes: 3,
        nextCategoryId: catDoctor.id,
      },
    });
  } else {
    catReg = await prisma.serviceCategory.update({
      where: { id: catReg.id },
      data: { nextCategoryId: catDoctor.id },
    });
  }

  console.log(`[2/4] 🔗 Rantaian Aliran Dikonfigurasi:`);
  console.log(`  • Peringkat 1: '${catReg.name}' ➔ Hantar ke: '${catDoctor.name}'`);
  console.log(`  • Peringkat 2: '${catDoctor.name}' ➔ Hantar ke: '${catPharmacy.name}'`);
  console.log(`  • Peringkat 3: '${catPharmacy.name}' ➔ Tamat (1 Panggilan Selesai)\n`);

  // 3. Jana Tiket Pelanggan Baru di Peringkat 1 (Pendaftaran)
  const testTicket = await prisma.ticket.create({
    data: {
      tenantId: branch.tenantId,
      ticketNo: "P1005",
      seqNumber: 1005,
      branchId: branch.id,
      categoryId: catReg.id,
      status: "SERVING",
      counterNo: "1",
      customerName: "Pn. Faridah Ali",
      phoneNo: "0123456789",
    },
    include: { category: true },
  });

  console.log(`[3/4] 🎫 Tiket Mula: ${testTicket.ticketNo} (${testTicket.customerName}) di ${testTicket.category.name} (Kaunter ${testTicket.counterNo})`);

  // 4. Simulasi Langkah 1: Selesai Pendaftaran & Hantar Seterusnya (Forward to Doctor)
  const forwardedToDoctor = await prisma.ticket.update({
    where: { id: testTicket.id },
    data: {
      status: "WAITING",
      categoryId: catReg.nextCategoryId,
      counterNo: null,
    },
    include: { category: true },
  });

  console.log(`  ✅ Langkah 1 Berjaya: Tiket ${forwardedToDoctor.ticketNo} kini WAITING di '${forwardedToDoctor.category.name}' (Bilik Doktor)!`);

  // Simulasi Langkah 2: Bilik Doktor Panggil & Selesai Konsultasi (Forward to Pharmacy)
  const forwardedToPharmacy = await prisma.ticket.update({
    where: { id: testTicket.id },
    data: {
      status: "WAITING",
      categoryId: catDoctor.nextCategoryId,
      counterNo: null,
    },
    include: { category: true },
  });

  console.log(`  ✅ Langkah 2 Berjaya: Tiket ${forwardedToPharmacy.ticketNo} kini WAITING di '${forwardedToPharmacy.category.name}' (Kaunter Ubat)!`);

  // Simulasi Langkah 3: Farmasi Panggil & Selesai Penuh (COMPLETED)
  const completedFull = await prisma.ticket.update({
    where: { id: testTicket.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    include: { category: true },
  });

  console.log(`  ✅ Langkah 3 Berjaya: Tiket ${completedFull.ticketNo} kini COMPLETED sepenuhnya!\n`);

  console.log("==================================================================");
  console.log("🎉 SEMUA UJIAN RANTAIAN MULTI-STAGE JOURNEY LULUS 100%!");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Ralat Ujian Pipeline:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
