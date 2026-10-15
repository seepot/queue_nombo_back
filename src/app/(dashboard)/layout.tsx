import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import IdleSessionManager from "@/components/IdleSessionManager";
import BroadcastBanner from "@/components/BroadcastBanner";

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
    <>
      <IdleSessionManager />
      <div className="flex min-h-screen bg-slate-100">
        <Sidebar userRole={(session.user as any)?.role || "COUNTER_STAFF"} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <BroadcastBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
