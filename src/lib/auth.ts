import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function sha1(input: string): string {
  return createHash("sha1").update(input).digest("hex");
}

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
        const hashedPassword = sha1(password);

        const user = await prisma.user.findFirst({
          where: {
            uname: username,
            pass: hashedPassword,
          },
        });

        if (!user) {
          return null;
        }

        // Block inactive users
        if (user.catatan === "inactive") {
          return null;
        }

        // Look up branch name
        const cawangan = user.idCawangan
          ? await prisma.cawangan.findFirst({
              where: { idCawangan: user.idCawangan },
            })
          : null;

        // Look up kaunter assignment (from jadual_tugasan)
        const kaunterData = await prisma.$queryRaw<
          Array<{
            id_kaunter: number;
            no_kaunter: string | null;
            nama_kaunter: string | null;
            susunan_keutamaan: string | null;
          }>
        >`
          SELECT k.id as id_kaunter, k.no_kaunter, k.nama_kaunter, k.susunan_keutamaan
           FROM kaunter k INNER JOIN jadual_tugasan j ON j.id_kaunter = k.id
           WHERE j.nokp = ${username} LIMIT 1
        `;

        const kaunter = kaunterData[0] || null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(Date.now() + 8 * 60 * 60 * 1000) },
        });

        return {
          id: String(user.id),
          name: user.nama,
          email: null,
          levelAkses: String(user.levelAkses || 3),
          idCawangan: user.idCawangan || "0",
          namaCawangan: cawangan?.namaCawangan || "",
          noKaunter: kaunter?.no_kaunter || undefined,
          seksyen: kaunter?.nama_kaunter || undefined,
          idKaunter: kaunter ? Number(kaunter.id_kaunter) : undefined,
          susunanKeutamaan: kaunter?.susunan_keutamaan || undefined,
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
        token.levelAkses = u.levelAkses;
        token.idCawangan = u.idCawangan;
        token.namaCawangan = u.namaCawangan;
        token.noKaunter = u.noKaunter;
        token.seksyen = u.seksyen;
        token.idKaunter = u.idKaunter;
        token.susunanKeutamaan = u.susunanKeutamaan;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = session.user as any;
        s.id = token.id;
        s.levelAkses = token.levelAkses;
        s.idCawangan = token.idCawangan;
        s.namaCawangan = token.namaCawangan;
        s.noKaunter = token.noKaunter;
        s.seksyen = token.seksyen;
        s.idKaunter = token.idKaunter;
        s.susunanKeutamaan = token.susunanKeutamaan;
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
