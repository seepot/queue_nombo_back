import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ success: false, message: "Tidak dibenarkan." }, { status: 401 });
    }

    const tenantId = user.tenantId;
    if (!tenantId && user.role !== "SUPERADMIN") {
      return NextResponse.json({ success: false, message: "Akaun tiada organisasi." }, { status: 400 });
    }

    const whereTenant = tenantId ? { tenantId } : {};

    const branches = await prisma.branch.findMany({
      where: whereTenant,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        counters: { orderBy: { counterNo: "asc" } },
        categories: { orderBy: { sortOrder: "asc" } },
        devices: true,
        users: { select: { id: true, name: true, username: true, role: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    const subscription = tenantId
      ? await prisma.subscription.findFirst({
          where: { tenantId, status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        })
      : null;

    const maxBranches = subscription?.maxBranches || 1;

    return NextResponse.json({
      success: true,
      branches,
      maxBranches,
      usedBranches: branches.length,
    });
  } catch (error: any) {
    console.error("[Branches GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat mengambil senarai cawangan." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user || (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan. Hanya Pentadbir Organisasi dibenarkan." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, phone, qrRadiusMeters, operatingHours } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Nama dan kod cawangan wajib diisi." },
        { status: 400 }
      );
    }

    let tenantId = user.tenantId;
    if (!tenantId && user.role === "SUPERADMIN") {
      tenantId = body.tenantId;
    }

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Organisasi tidak dikenal pasti." },
        { status: 400 }
      );
    }

    // 1. Semak had kuota cawangan langganan
    const [currentBranchCount, subscription] = await Promise.all([
      prisma.branch.count({ where: { tenantId } }),
      prisma.subscription.findFirst({
        where: { tenantId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const maxAllowed = subscription?.maxBranches || 1;

    if (currentBranchCount >= maxAllowed && user.role !== "SUPERADMIN") {
      return NextResponse.json(
        {
          success: false,
          message: `Had cawangan bagi pelan langganan anda telah dicapai (${currentBranchCount}/${maxAllowed}). Sila naik taraf pelan untuk menambah cawangan.`,
        },
        { status: 400 }
      );
    }

    // 2. Cipta Cawangan Baharu
    const newBranch = await prisma.branch.create({
      data: {
        tenantId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address ? address.trim() : null,
        phone: phone ? phone.trim() : null,
        qrRadiusMeters: qrRadiusMeters ? parseInt(qrRadiusMeters) : 500,
        settings: {
          operatingHours: operatingHours || {
            openTime: "08:30",
            closeTime: "17:00",
            days: ["ISNIN", "SELASA", "RABU", "KHAMIS", "JUMAAT"],
          },
        },
      },
    });

    // 3. Cipta Kategori Urusan Default (A - Pendaftaran)
    await prisma.serviceCategory.create({
      data: {
        branchId: newBranch.id,
        name: "Pertanyaan & Pendaftaran",
        prefixCode: "A",
        startNumber: 1001,
        currentSeq: 1000,
        estimatedMinutes: 5,
        sortOrder: 1,
      },
    });

    // 4. Cipta Kaunter Default (Kaunter 1)
    await prisma.counter.create({
      data: {
        branchId: newBranch.id,
        counterNo: "1",
        name: "Kaunter 1",
        zone: "Zon Utama",
        status: "OPEN",
        priorityOrder: "A",
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: "BRANCH_CREATED",
        details: { branchName: newBranch.name, branchCode: newBranch.code, createdBy: user.email },
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cawangan '${newBranch.name}' berjaya dicipta bersama kaunter & kategori asas!`,
      branch: newBranch,
    });
  } catch (error: any) {
    console.error("[Branches POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat semasa mencipta cawangan." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user || (user.role !== "TENANT_ADMIN" && user.role !== "SUPERADMIN" && user.role !== "BRANCH_MANAGER")) {
      return NextResponse.json({ success: false, message: "Akses dinafikan." }, { status: 403 });
    }

    const body = await req.json();
    const { branchId, name, code, address, phone, qrRadiusMeters, operatingHours, action, latitude, longitude } = body;

    if (!branchId) {
      return NextResponse.json({ success: false, message: "branchId diperlukan." }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ success: false, message: "Cawangan tidak ditemui." }, { status: 404 });
    }

    // A. TINDAKAN PENGURUSAN KAUNTER (ADD / UPDATE / DELETE COUNTER)
    if (action === "ADD_COUNTER") {
      const { counterNo, counterName, zone, priorityOrder } = body;
      const counter = await prisma.counter.create({
        data: {
          branchId,
          counterNo: counterNo || `${Date.now().toString().slice(-2)}`,
          name: counterName || `Kaunter ${counterNo}`,
          zone: zone || "Zon Utama",
          priorityOrder: priorityOrder || "A",
          status: "OPEN",
        },
      });
      return NextResponse.json({ success: true, message: `Kaunter ${counter.counterNo} berjaya ditambah!`, counter });
    }

    if (action === "UPDATE_COUNTER") {
      const { counterId, counterNo, counterName, zone, status, priorityOrder } = body;
      const updated = await prisma.counter.update({
        where: { id: counterId },
        data: {
          ...(counterNo ? { counterNo } : {}),
          ...(counterName !== undefined ? { name: counterName } : {}),
          ...(zone !== undefined ? { zone } : {}),
          ...(status ? { status } : {}),
          ...(priorityOrder !== undefined ? { priorityOrder } : {}),
        },
      });
      return NextResponse.json({ success: true, message: `Kaunter ${updated.counterNo} berjaya dikemas kini!`, counter: updated });
    }

    if (action === "DELETE_COUNTER") {
      const { counterId } = body;
      await prisma.counter.delete({ where: { id: counterId } });
      return NextResponse.json({ success: true, message: "Kaunter berjaya dipadam." });
    }

    // B. TINDAKAN PENGURUSAN KATEGORI (ADD / UPDATE / DELETE CATEGORY)
    if (action === "ADD_CATEGORY") {
      const { catName, prefixCode, startNumber, estimatedMinutes, nextCategoryId } = body;
      const parsedStartNo = startNumber ? parseInt(String(startNumber)) : 1001;
      const startNoVal = isNaN(parsedStartNo) ? 1001 : parsedStartNo;
      const parsedEstMin = estimatedMinutes ? parseInt(String(estimatedMinutes)) : 5;
      const estMinVal = isNaN(parsedEstMin) ? 5 : parsedEstMin;

      const cat = await prisma.serviceCategory.create({
        data: {
          branchId,
          name: catName,
          prefixCode: (prefixCode || "A").toUpperCase(),
          startNumber: startNoVal,
          currentSeq: startNoVal - 1,
          estimatedMinutes: estMinVal,
          nextCategoryId: nextCategoryId || null,
        },
      });
      return NextResponse.json({ success: true, message: `Kategori '${cat.name}' (${cat.prefixCode}) berjaya dicipta!`, category: cat });
    }

    if (action === "UPDATE_CATEGORY") {
      const { categoryId, catName, prefixCode, startNumber, estimatedMinutes, nextCategoryId } = body;
      const parsedStartNo = startNumber !== undefined && startNumber !== null && startNumber !== "" ? parseInt(String(startNumber)) : null;
      const parsedEstMin = estimatedMinutes !== undefined && estimatedMinutes !== null && estimatedMinutes !== "" ? parseInt(String(estimatedMinutes)) : null;

      const updated = await prisma.serviceCategory.update({
        where: { id: categoryId },
        data: {
          ...(catName ? { name: catName } : {}),
          ...(prefixCode ? { prefixCode: prefixCode.toUpperCase() } : {}),
          ...(parsedStartNo !== null && !isNaN(parsedStartNo) ? { startNumber: parsedStartNo } : {}),
          ...(parsedEstMin !== null && !isNaN(parsedEstMin) ? { estimatedMinutes: parsedEstMin } : {}),
          ...(nextCategoryId !== undefined ? { nextCategoryId: nextCategoryId ? nextCategoryId : null } : {}),
        },
      });
      return NextResponse.json({ success: true, message: `Kategori '${updated.name}' berjaya dikemas kini!`, category: updated });
    }

    if (action === "DELETE_CATEGORY") {
      const { categoryId } = body;
      await prisma.serviceCategory.delete({ where: { id: categoryId } });
      return NextResponse.json({ success: true, message: "Kategori servis berjaya dipadam." });
    }

    // C. TINDAKAN PENGURUSAN STAF CAWANGAN (CREATE / ASSIGN / UNASSIGN / RESET PASSWORD)
    if (action === "CREATE_BRANCH_STAFF") {
      const { name, username: staffUsername, email, phone, password } = body;

      if (!staffUsername || !name) {
        return NextResponse.json({ success: false, message: "Nama dan username staf wajib diisi." }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { username: staffUsername.trim().toLowerCase() } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Username telah digunakan oleh staf lain." }, { status: 400 });
      }

      const initialPassword = password?.trim() || "admin123";
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      const newStaff = await prisma.user.create({
        data: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          name: name.trim(),
          username: staffUsername.trim().toLowerCase(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          passwordHash,
          role: "COUNTER_STAFF",
          status: "ACTIVE",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Staf '${newStaff.name}' (@${newStaff.username}) berjaya didaftarkan ke cawangan ini!`,
        generatedPassword: initialPassword,
        staff: newStaff,
      });
    }

    if (action === "ASSIGN_EXISTING_STAFF") {
      const { userId } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, tenantId: branch.tenantId },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, message: "Pengguna tidak ditemui." }, { status: 404 });
      }

      const updated = await prisma.user.update({
        where: { id: targetUser.id },
        data: { branchId: branch.id },
      });

      return NextResponse.json({
        success: true,
        message: `'${updated.name || updated.username}' berjaya ditugaskan ke cawangan ${branch.name}!`,
        staff: updated,
      });
    }

    if (action === "UNASSIGN_BRANCH_STAFF") {
      const { userId } = body;
      await prisma.user.update({
        where: { id: userId },
        data: { branchId: null },
      });

      return NextResponse.json({
        success: true,
        message: "Staf berjaya dikeluarkan dari cawangan ini.",
      });
    }

    if (action === "RESET_BRANCH_STAFF_PASSWORD") {
      const { userId, newPassword } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, branchId: branch.id },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, message: "Staf tidak ditemui di cawangan ini." }, { status: 404 });
      }

      const finalPassword = newPassword?.trim() || `QueNombo#${Date.now().toString().slice(-4)}!`;
      const passwordHash = await bcrypt.hash(finalPassword, 10);

      await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash },
      });

      return NextResponse.json({
        success: true,
        message: `Kata laluan staf '${targetUser.name || targetUser.username}' berjaya diset semula!`,
        generatedPassword: finalPassword,
      });
    }

    // C. TINDAKAN PERLANTIKAN KETUA CAWANGAN (ASSIGN / CREATE / REMOVE BRANCH MANAGER)
    if (action === "ASSIGN_BRANCH_MANAGER") {
      const { userId } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, tenantId: branch.tenantId },
      });

      if (!targetUser) {
        return NextResponse.json({ success: false, message: "Pengguna tidak ditemui." }, { status: 404 });
      }

      // Kemas kini peranan & cawangan staf kepada BRANCH_MANAGER
      await prisma.user.update({
        where: { id: targetUser.id },
        data: {
          role: "BRANCH_MANAGER",
          branchId: branch.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: branch.tenantId,
          action: "BRANCH_MANAGER_ASSIGNED",
          details: { branchName: branch.name, managerName: targetUser.name || targetUser.username, assignedBy: user.email },
          status: "SUCCESS",
        },
      });

      return NextResponse.json({
        success: true,
        message: `'${targetUser.name || targetUser.username}' berjaya dilantik sebagai Ketua Cawangan ${branch.name}!`,
      });
    }

    if (action === "CREATE_BRANCH_MANAGER") {
      const { name, username: staffUsername, email, phone, password } = body;

      if (!staffUsername || !name) {
        return NextResponse.json({ success: false, message: "Nama dan username wajib diisi." }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { username: staffUsername.trim().toLowerCase() } });
      if (existing) {
        return NextResponse.json({ success: false, message: "Username telah digunakan oleh staf lain." }, { status: 400 });
      }

      const initialPassword = password?.trim() || "admin123";
      const passwordHash = await bcrypt.hash(initialPassword, 10);

      const newManager = await prisma.user.create({
        data: {
          tenantId: branch.tenantId,
          branchId: branch.id,
          name: name.trim(),
          username: staffUsername.trim().toLowerCase(),
          email: email ? email.trim() : null,
          phone: phone ? phone.trim() : null,
          passwordHash,
          role: "BRANCH_MANAGER",
          status: "ACTIVE",
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: branch.tenantId,
          action: "BRANCH_MANAGER_CREATED",
          details: { branchName: branch.name, managerUsername: newManager.username, createdBy: user.email },
          status: "SUCCESS",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Ketua Cawangan '${newManager.name}' (@${newManager.username}) berjaya didaftarkan!`,
        generatedPassword: initialPassword,
        manager: newManager,
      });
    }

    if (action === "REMOVE_BRANCH_MANAGER") {
      const { userId } = body;
      const targetUser = await prisma.user.findFirst({
        where: { id: userId, branchId: branch.id },
      });

      if (targetUser) {
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { role: "COUNTER_STAFF" },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Perlantikan Ketua Cawangan berjaya ditamatkan (ditukar ke Staf Kaunter).",
      });
    }

    // D. KEMAS KINI PROFIL UTAMA CAWANGAN
    const currentSettings = (branch.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...(operatingHours ? { operatingHours } : {}),
    };

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        ...(address !== undefined ? { address: address ? address.trim() : null } : {}),
        ...(phone !== undefined ? { phone: phone ? phone.trim() : null } : {}),
        ...(latitude !== undefined ? { latitude: latitude !== null && latitude !== "" && !isNaN(parseFloat(String(latitude))) ? parseFloat(String(latitude)) : null } : {}),
        ...(longitude !== undefined ? { longitude: longitude !== null && longitude !== "" && !isNaN(parseFloat(String(longitude))) ? parseFloat(String(longitude)) : null } : {}),
        ...(qrRadiusMeters !== undefined ? { qrRadiusMeters: parseInt(qrRadiusMeters) } : {}),
        settings: updatedSettings,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: branch.tenantId,
        action: "BRANCH_UPDATED",
        details: { branchName: updated.name, updatedBy: user.email },
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tetapan cawangan '${updated.name}' berjaya dikemas kini!`,
      branch: updated,
    });
  } catch (error: any) {
    console.error("[Branches PATCH Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat semasa mengemas kini cawangan." },
      { status: 500 }
    );
  }
}
