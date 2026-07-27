import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Providers from "@/components/Providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <Providers>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar userLevel={session.user.levelAkses} />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </Providers>
  );
}
