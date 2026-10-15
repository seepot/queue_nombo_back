/**
 * seed-clean-shared-stage-pool.js
 * Mengemas kini dan menyusun data contoh cawangan mengikut struktur Shared Stage Pool yang sebenar.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("==================================================================");
  console.log("🏥 MENYUSUN DATA CONTOH KLINIK KE STRUKTUR SHARED STAGE POOL");
  console.log("==================================================================\n");

  const branches = await prisma.branch.findMany();

  for (const branch of branches) {
    console.log(`\n🏢 Mengemas kini cawangan: ${branch.name} (${branch.code || branch.id})`);

    // 1. Padam kategori dan kaunter lama yang tidak tersusun
    await prisma.ticket.deleteMany({ where: { branchId: branch.id } });
    await prisma.appointment.deleteMany({ where: { branchId: branch.id } });
    await prisma.serviceCategory.deleteMany({ where: { branchId: branch.id } });
    await prisma.counter.deleteMany({ where: { branchId: branch.id } });

    // 2. Bina 3 Peringkat Urusan Rantaian Sebenar (Stage 1 -> Stage 2 -> Stage 3)
    // Stage 3: Farmasi & Bayaran (Tamat)
    const catPharmacy = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Farmasi & Bayaran",
        prefixCode: "C",
        startNumber: 3001,
        currentSeq: 3000,
        estimatedMinutes: 5,
        status: "ACTIVE",
        sortOrder: 3,
        nextCategoryId: null,
      },
    });

    // Stage 2: Konsultasi / Rawatan Doktor (Next -> Farmasi)
    const catDoctor = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Konsultasi & Rawatan Doktor",
        prefixCode: "B",
        startNumber: 2001,
        currentSeq: 2000,
        estimatedMinutes: 10,
        status: "ACTIVE",
        sortOrder: 2,
        nextCategoryId: catPharmacy.id,
      },
    });

    // Stage 1: Pendaftaran & Saringan (Next -> Doktor)
    const catReg = await prisma.serviceCategory.create({
      data: {
        branchId: branch.id,
        name: "Pendaftaran & Saringan",
        prefixCode: "A",
        startNumber: 1001,
        currentSeq: 1000,
        estimatedMinutes: 3,
        status: "ACTIVE",
        sortOrder: 1,
        nextCategoryId: catDoctor.id,
      },
    });

    console.log("  ✅ 3 Kategori Peringkat Servis Dicipta:");
    console.log(`     [A] ${catReg.name} ➔ Seterusnya: '${catDoctor.name}'`);
    console.log(`     [B] ${catDoctor.name} ➔ Seterusnya: '${catPharmacy.name}'`);
    console.log(`     [C] ${catPharmacy.name} ➔ Seterusnya: 🏁 Tamat`);

    // 3. Bina Kaunter & Bilik-Bilik Fizikal Sebenar
    await prisma.counter.createMany({
      data: [
        {
          branchId: branch.id,
          counterNo: "1",
          name: "Kaunter Pendaftaran 1",
          zone: "Zon Pendaftaran",
          status: "OPEN",
          priorityOrder: "A",
        },
        {
          branchId: branch.id,
          counterNo: "Bilik 1",
          name: "Bilik Doktor 1 (Dr. Azman)",
          zone: "Zon Konsultasi",
          status: "OPEN",
          priorityOrder: "B",
        },
        {
          branchId: branch.id,
          counterNo: "Bilik 2",
          name: "Bilik Doktor 2 (Dr. Sarah)",
          zone: "Zon Konsultasi",
          status: "OPEN",
          priorityOrder: "B",
        },
        {
          branchId: branch.id,
          counterNo: "Bilik 3",
          name: "Bilik Doktor 3 (Dr. Lee)",
          zone: "Zon Konsultasi",
          status: "OPEN",
          priorityOrder: "B",
        },
        {
          branchId: branch.id,
          counterNo: "Farmasi 1",
          name: "Kaunter Farmasi & Bayaran",
          zone: "Zon Farmasi",
          status: "OPEN",
          priorityOrder: "C",
        },
      ],
    });

    console.log("  ✅ 5 Kaunter & Bilik Fizikal Dicipta:");
    console.log("     • Kaunter 1 (Pendaftaran)");
    console.log("     • Bilik 1 (Dr. Azman) - Melayan Kategori B");
    console.log("     • Bilik 2 (Dr. Sarah) - Melayan Kategori B");
    console.log("     • Bilik 3 (Dr. Lee)   - Melayan Kategori B");
    console.log("     • Farmasi 1 (Ubat & Bayaran) - Melayan Kategori C");
  }

  console.log("\n==================================================================");
  console.log("🎉 SUSUNAN SHARED STAGE POOL SELESAI DENGAN JAYA!");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("❌ Ralat Kemaskini Data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
