import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      levelAkses: string;
      idCawangan: string;
      namaCawangan: string;
      noKaunter?: string;
      seksyen?: string;
      idKaunter?: number;
      susunanKeutamaan?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    levelAkses: string;
    idCawangan: string;
    namaCawangan: string;
    noKaunter?: string;
    seksyen?: string;
    idKaunter?: number;
    susunanKeutamaan?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    levelAkses: string;
    idCawangan: string;
    namaCawangan: string;
    noKaunter?: string;
    seksyen?: string;
    idKaunter?: number;
    susunanKeutamaan?: string;
  }
}
