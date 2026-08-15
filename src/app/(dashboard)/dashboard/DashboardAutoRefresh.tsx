"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  intervalMs?: number;
}

export default function DashboardAutoRefresh({
  intervalMs = 60_000,
}: Props) {
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    setLastRefresh(new Date());

    const interval = window.setInterval(() => {
      setLastRefresh(new Date());
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return (
    <p className="mb-3 text-right text-xs text-gray-400">
      Last refresh:{" "}
      {lastRefresh
        ? lastRefresh.toLocaleString("ms-MY", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
        : "-"}
    </p>
  );
}
