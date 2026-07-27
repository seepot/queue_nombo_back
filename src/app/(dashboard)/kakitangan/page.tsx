import { auth } from "@/lib/auth";
import KakitanganListPage from "./KakitanganListPage";

export default async function KakitanganPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; cawangan?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const params = await searchParams;
  const isAdmin = session.user.levelAkses === "1";
  const cawangan = isAdmin ? params.cawangan || "" : session.user.idCawangan;

  return (
    <KakitanganListPage
      isAdmin={isAdmin}
      defaultCawangan={cawangan}
      page={Number(params.page) || 1}
    />
  );
}
