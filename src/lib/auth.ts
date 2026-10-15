import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/auditLogger";
import { getClientIp } from "@/lib/rate-limit";
import { checkLoginAllowed, clearLoginFailures, recordLoginFailure } from "@/lib/login-throttle";

/** Ralat khas supaya klien menerima code="throttled" tanpa mendedahkan butiran akaun. */
class LoginThrottledError extends CredentialsSignin {
  code = "throttled";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;
        const ip = request ? getClientIp(request) : "unknown";

        // Perlindungan brute force: semak kunci sebelum menyentuh pangkalan data
        const gate = await checkLoginAllowed(username, ip);
        if (!gate.allowed) {
          logAudit({
            action: "LOG_MASUK",
            username,
            status: "FAILED",
            details: { reason: "Terlalu banyak percubaan", blockedBy: gate.reason, ip, retryAfterSec: gate.retryAfterSec },
          });
          throw new LoginThrottledError();
        }

        const user = await prisma.user.findFirst({
          where: {
            username: username,
          },
          include: {
            branch: true,
            tenant: true,
          },
        });

        if (!user) {
          const failure = await recordLoginFailure(username, ip);
          logAudit({
            action: "LOG_MASUK",
            username,
            status: "FAILED",
            details: { reason: "Pengguna tidak wujud", ip, locked: failure.userLocked || failure.ipLocked },
          });
          return null;
        }

        // Verify password against passwordHash
        const res = await verifyPassword(password, user.passwordHash);
        if (!res.valid) {
          const failure = await recordLoginFailure(username, ip);
          logAudit({
            action: "LOG_MASUK",
            userId: user.id,
            username: user.username,
            cawangan: user.branch?.name || null,
            status: "FAILED",
            details: {
              reason: "Kata laluan tidak sah",
              ip,
              attemptsLeft: failure.userAttemptsLeft,
              locked: failure.userLocked || failure.ipLocked,
            },
          });
          return null;
        }

        // Block inactive users
        if (user.status !== "ACTIVE") {
          return null;
        }

        // Look up assigned counter if any
        const counter = await prisma.counter.findFirst({
          where: {
            assignedUserId: user.id,
            ...(user.branchId ? { branchId: user.branchId } : {}),
          },
        });

        // Update last login & padam kiraan kegagalan
        await Promise.all([
          prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          }),
          clearLoginFailures(username),
        ]);

        logAudit({
          action: "LOG_MASUK",
          userId: user.id,
          username: user.username,
          userRole: user.role,
          cawangan: user.branch?.name || null,
          status: "SUCCESS",
          details: { nama: user.name, cawangan: user.branch?.name },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          tenantName: user.tenant?.name || "",
          branchId: user.branchId,
          branchName: user.branch?.name || "",
          counterNo: counter?.counterNo || undefined,
          counterId: counter?.id || undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any;
        token.id = u.id;
        token.role = u.role;
        token.tenantId = u.tenantId;
        token.tenantName = u.tenantName;
        token.branchId = u.branchId;
        token.branchName = u.branchName;
        token.counterNo = u.counterNo;
        token.counterId = u.counterId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session.user as any;
        s.id = token.id;
        s.role = token.role;
        s.tenantId = token.tenantId;
        s.tenantName = token.tenantName;
        s.branchId = token.branchId;
        s.branchName = token.branchName;
        s.counterNo = token.counterNo;
        s.counterId = token.counterId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
