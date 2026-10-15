import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { enforceIpRateLimit } from "@/lib/rate-limit";
import { validateNewPassword } from "@/lib/password-reset";
import { normalizeTenantSlug, validateTenantSlug } from "@/lib/tenant";
import { sendVerificationEmail, shouldExposeDevVerifyLink } from "@/lib/email-verification";
import { logAudit } from "@/lib/auditLogger";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/**
 * POST /api/auth/register
 * Pendaftaran tenant layan diri: cipta Tenant, Langganan TRIAL 14 hari, Cawangan,
 * kategori, kaunter dan pengguna TENANT_ADMIN dalam satu transaksi, kemudian hantar
 * e-mel pengesahan (token Redis 24 jam). Pengguna boleh log masuk sebelum mengesahkan
 * e-mel, tetapi tindakan bil memerlukan e-mel yang disahkan.
 */
export async function POST(req: NextRequest) {
  try {
    // Had pendaftaran: 5 akaun sejam bagi setiap IP (anti-abuse)
    const limited = await enforceIpRateLimit(
      req,
      "tenant-register",
      5,
      60 * 60,
      "Terlalu banyak pendaftaran dari rangkaian ini. Sila cuba semula dalam sejam."
    );
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const username = typeof body?.username === "string" ? body.username.toLowerCase().trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const password: unknown = body?.password;

    if (!companyName || !name || !username || !email || !password) {
      return NextResponse.json(
        { success: false, message: "Semua medan bertanda * wajib diisi." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      return NextResponse.json(
        { success: false, message: "Format alamat e-mel tidak sah." },
        { status: 400 }
      );
    }

    if (!USERNAME_PATTERN.test(username)) {
      return NextResponse.json(
        {
          success: false,
          message: "Username mesti 3-32 aksara dan hanya mengandungi huruf kecil, nombor, titik, sengkang atau garis bawah.",
        },
        { status: 400 }
      );
    }

    // Kekuatan kata laluan: peraturan yang sama seperti tetapan semula kata laluan
    const passwordError = validateNewPassword(password);
    if (passwordError) {
      return NextResponse.json({ success: false, message: passwordError }, { status: 400 });
    }

    // Bersihkan & sahkan slug (format, panjang, senarai terpelihara)
    const slug = normalizeTenantSlug(body?.slug || companyName);
    const slugError = validateTenantSlug(slug);
    if (slugError) {
      return NextResponse.json({ success: false, message: slugError }, { status: 400 });
    }

    // 1. Semak keunikan slug, username dan e-mel
    const existingSlug = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (existingSlug) {
      return NextResponse.json(
        { success: false, message: `Slug syarikat '${slug}' telah digunakan. Sila pilih slug lain.` },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: `Username '${username}' telah didaftarkan. Sila guna username lain.` },
        { status: 400 }
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: "E-mel ini telah didaftarkan. Sila log masuk atau guna e-mel lain." },
        { status: 400 }
      );
    }

    // Hash kata laluan menggunakan bcrypt
    const passwordHash = await hashPassword(password as string);

    // 2. Laksanakan transaksi atomik pembinaan struktur Tenant lengkap
    const result = await prisma.$transaction(async (tx) => {
      // A. Cipta Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug,
          email,
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

      // F. Cipta Akaun Pentadbir Tenant (TENANT_ADMIN) - e-mel belum disahkan
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          username,
          email,
          name,
          passwordHash,
          role: "TENANT_ADMIN",
          phone: phone || null,
          status: "ACTIVE",
          emailVerifiedAt: null,
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
          details: { companyName, slug, username, email },
          status: "SUCCESS",
        },
      });

      return {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        companyName: tenant.name,
        branchId: branch.id,
        userId: adminUser.id,
        username: adminUser.username,
      };
    });

    // 3. Hantar e-mel pengesahan (di luar transaksi: kegagalan mel tidak membatalkan pendaftaran;
    //    pengguna boleh meminta pautan baharu melalui /api/auth/resend-verification)
    let verification: Awaited<ReturnType<typeof sendVerificationEmail>> | null = null;
    try {
      verification = await sendVerificationEmail({ id: result.userId, email, name, username });
    } catch (mailError) {
      console.error("[Tenant Register] Gagal menghantar e-mel pengesahan:", mailError);
    }

    logAudit({
      action: "EMAIL_VERIFICATION_SENT",
      userId: result.userId,
      username,
      status: verification ? "SUCCESS" : "FAILED",
      details: verification
        ? { context: "register", delivered: verification.mail.delivered, provider: verification.mail.provider }
        : { context: "register", error: "token/mail failure" },
    });

    const exposeDevLink = verification ? shouldExposeDevVerifyLink(verification.mail) : false;

    return NextResponse.json({
      success: true,
      message: `Pendaftaran syarikat '${result.companyName}' berjaya! Pautan pengesahan telah dihantar ke ${email}. Sila log masuk.`,
      data: {
        tenantId: result.tenantId,
        tenantSlug: result.tenantSlug,
        companyName: result.companyName,
        branchId: result.branchId,
        username: result.username,
        email,
      },
      verificationEmail: {
        sent: !!verification,
        delivered: verification?.mail.delivered ?? false,
        provider: verification?.mail.provider ?? null,
      },
      ...(exposeDevLink && verification
        ? {
            devVerifyUrl: verification.verifyUrl,
            devNote: "RESEND_API_KEY tidak ditetapkan; pautan pengesahan dipaparkan untuk pembangunan sahaja.",
          }
        : {}),
    });
  } catch (error) {
    console.error("[Tenant Register Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memproses pendaftaran syarikat." },
      { status: 500 }
    );
  }
}
