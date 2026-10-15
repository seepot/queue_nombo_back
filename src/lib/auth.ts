import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/auditLogger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const username = credentials.username as string;
        const password = credentials.password as string;

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
          logAudit({
            action: "LOG_MASUK",
            username,
            status: "FAILED",
            details: { reason: "Pengguna tidak wujud" },
          });
          return null;
        }

        // Verify password against passwordHash
        const res = await verifyPassword(password, user.passwordHash);
        if (!res.valid) {
          logAudit({
            action: "LOG_MASUK",
            userId: user.id,
            username: user.username,
            cawangan: user.branch?.name || null,
            status: "FAILED",
            details: { reason: "Kata laluan tidak sah" },
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

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

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
