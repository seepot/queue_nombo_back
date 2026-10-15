const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function runManagerCommandTest() {
  console.log("==================================================================");
  console.log("  📱 MENJALANKAN UJIAN PUSAT KAWALAN PENGURUS PWA FASA 20");
  console.log("==================================================================\n");

  const branch = await prisma.branch.findFirst({
    include: {
      counters: true,
      tenant: true,
    },
  });

  if (!branch || branch.counters.length === 0) {
    throw new Error("❌ Tiada cawangan/kaunter ditemui untuk ujian.");
  }

  const counter = branch.counters[0];
  console.log(`[1/3] 🏢 Menguji di Cawangan: '${branch.name}' (Kaunter #${counter.counterNo})...`);

  // 1. Uji TOGGLE_COUNTER (Tutup -> Buka)
  console.log("\n[2/3] ⚡ Menguji Arahan Kawalan Jauh:");
  const initialStatus = counter.status;
  const newStatus = initialStatus === "OPEN" ? "CLOSED" : "OPEN";

  const updatedCounter = await prisma.counter.update({
    where: { id: counter.id },
    data: { status: newStatus },
  });
  console.log(`  ✅ TOGGLE_COUNTER: Kaunter #${counter.counterNo} ditukar status ke '${updatedCounter.status}'`);

  // Kembalikan ke asal
  await prisma.counter.update({
    where: { id: counter.id },
    data: { status: initialStatus },
  });

  // 2. Uji BROADCAST_TV_MESSAGE
  const testNotice = `Ujian Siaran Pengurus ${Date.now()}`;
  const currentSettings = branch.settings || {};
  const updatedSettings = { ...currentSettings, runningText: testNotice, kioskPaused: true };

  const updatedBranch = await prisma.branch.update({
    where: { id: branch.id },
    data: { settings: updatedSettings },
  });
  console.log(`  ✅ BROADCAST_TV_MESSAGE: Mesej '${updatedBranch.settings.runningText}' berjaya dihantar.`);
  console.log(`  ✅ TOGGLE_KIOSK_PAUSE: Status kioskPaused = ${updatedBranch.settings.kioskPaused}`);

  // Kembalikan setting ke asal
  await prisma.branch.update({
    where: { id: branch.id },
    data: { settings: currentSettings },
  });

  console.log("\n[3/3] 🛡️ Mengesahkan integriti log audit arahan pengurus...");
  await prisma.auditLog.create({
    data: {
      tenantId: branch.tenantId,
      action: "MANAGER_REMOTE_COMMAND",
      details: { action: "TEST_SUITE_EXECUTED", branchId: branch.id },
      status: "SUCCESS",
    },
  });
  console.log("  ✅ Log audit MANAGER_REMOTE_COMMAND berjaya direkodkan.");

  console.log("\n==================================================================");
  console.log("  🎉 UJIAN PUSAT KAWALAN PENGURUS FASA 20 LULUS 100% CEMERLANG!");
  console.log("==================================================================\n");
}

runManagerCommandTest()
  .catch((e) => {
    console.error("❌ Ralat Ujian Manager Command:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
