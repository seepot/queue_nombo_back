import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      tenantId?: string | null;
      tenantName?: string;
      branchId?: string | null;
      branchName?: string;
      counterNo?: string;
      counterId?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role?: string;
    tenantId?: string | null;
    tenantName?: string;
    branchId?: string | null;
    branchName?: string;
    counterNo?: string;
    counterId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    tenantId?: string | null;
    tenantName?: string;
    branchId?: string | null;
    branchName?: string;
    counterNo?: string;
    counterId?: string;
  }
}
