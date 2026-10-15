import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      slug: rawSlug,
      name,
      username: rawUsername,
      email,
      password,
      phone,
    } = body;

    if (!companyName || !name || !rawUsername || !password) {
      return NextResponse.json(
        { success: false, message: "Semua medan bertanda * wajib diisi." },
        { status: 400 }
      );
    }

    // Bersihkan format slug (huruf kecil, sengkang sahaja)
    const slug = (rawSlug || companyName)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const username = rawUsername.toLowerCase().trim();

    // 1. Semak keunikan slug dan username
    const existingSlug = await prisma.tenant.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, message: `Slug syarikat '${slug}' telah digunakan. Sila pilih slug lain.` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: `Username '${username}' telah didaftarkan. Sila guna username lain.` },
        { status: 400 }
      );
    }

    // Hash kata laluan menggunakan bcrypt
    const passwordHash = await hashPassword(password);

    // 2. Laksanakan transaksi atomik pembinaan struktur Tenant lengkap
    const result = await prisma.$transaction(async (tx) => {
      // A. Cipta Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          email: email || null,
          phone: phone || null,
          planType: "FREE",
          status: "ACTIVE",
          settings: {
            theme: "light",
            logoUrl: null,
            voiceLanguage: "ms-MY",
            youtubeUrl: "https://www.youtube.com/embed/oe5HTPG7ksM",
            runningText: `Selamat Datang ke ${companyName} • Sila pastikan dokumen anda lengkap sebelum ke kaunter`,
          },
        },
      });

      // B. Cipta Langganan Percubaan (14 Hari Trial)
      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          planType: "FREE",
          status: "TRIAL",
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 hari
          maxBranches: 2,
          maxCounters: 5,
          maxDisplays: 2,
          whatsappQuota: 50,
          billingCycle: "MONTHLY",
        },
      });

      // C. Cipta Cawangan Utama
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: "Cawangan Utama",
          code: "HQ01",
          phone: phone || null,
          qrRadiusMeters: 500,
          settings: {
            operatingHours: "08:30 - 17:00",
            runningText: `Selamat Datang ke ${companyName} (Cawangan Utama)`,
          },
        },
      });

      // D. Cipta Kategori Urusan Lalai (Kod A & B)
      const catA = await tx.serviceCategory.create({
        data: {
          branchId: branch.id,
          name: "Pendaftaran & Pertanyaan",
          prefixCode: "A",
          startNumber: 1001,
          currentSeq: 1000,
          estimatedMinutes: 5,
          sortOrder: 1,
        },
      });

      await tx.serviceCategory.create({
        data: {
          branchId: branch.id,
          name: "Pembayaran & Kaunter Urusan",
          prefixCode: "B",
          startNumber: 2001,
          currentSeq: 2000,
          estimatedMinutes: 8,
          sortOrder: 2,
        },
      });

      // E. Cipta Kaunter Lalai
      const counter = await tx.counter.create({
        data: {
          branchId: branch.id,
          counterNo: "1",
          name: "Kaunter Utama 1",
          zone: "Zon Utama",
          status: "OPEN",
          priorityOrder: `${catA.prefixCode},B`,
        },
      });

      // F. Cipta Akaun Pentadbir Tenant (TENANT_ADMIN)
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          username,
          email: email || null,
          name,
          passwordHash,
          role: "TENANT_ADMIN",
          phone: phone || null,
          status: "ACTIVE",
        },
      });

      // Kemas kini kaunter dengan assignedUserId
      await tx.counter.update({
        where: { id: counter.id },
        data: { assignedUserId: adminUser.id },
      });

      // G. Log audit
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: adminUser.id,
          action: "TENANT_REGISTER",
          details: { companyName, slug, username },
          status: "SUCCESS",
        },
      });

      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        companyName: tenant.name,
        branchId: branch.id,
        username: adminUser.username,
      };
    });

    return NextResponse.json({
      success: true,
      message: `Pendaftaran syarikat '${result.companyName}' berjaya! Sila log masuk.`,
      data: result,
    });
  } catch (error) {
    console.error("[Tenant Register Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memproses pendaftaran syarikat." },
      { status: 500 }
    );
  }
}
