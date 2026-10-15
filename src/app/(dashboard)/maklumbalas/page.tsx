import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FeedbackClient from "./FeedbackClient";

export const metadata = {
  title: "Maklum Balas & Penarafan CSAT | QueNombo SaaS",
};

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  let tenantId = user.tenantId;

  let tenant = null;
  if (tenantId) {
    tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { branches: { take: 1 } },
    });
  } else {
    // Fallback untuk SuperAdmin
    tenant = await prisma.tenant.findFirst({
      include: { branches: { take: 1 } },
    });
    tenantId = tenant?.id;
  }

  const branch = tenant?.branches[0];

  const rawFeedbacks = await prisma.feedback.findMany({
    where: {
      ...(user.role !== "SUPERADMIN" && tenantId ? { tenantId } : {}),
      ...(branch ? { branchId: branch.id } : {}),
    },
    include: {
      ticket: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const totalFeedbacks = rawFeedbacks.length;
  let totalRatingSum = 0;
  let positiveCount = 0;
  const starDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCountMap: Record<string, number> = {};

  rawFeedbacks.forEach((f) => {
    totalRatingSum += f.rating;
    if (f.rating >= 4) {
      positiveCount++;
    }
    if (starDistribution[f.rating] !== undefined) {
      starDistribution[f.rating]++;
    }

    if (Array.isArray(f.tags)) {
      f.tags.forEach((tag) => {
        const tagStr = String(tag);
        tagCountMap[tagStr] = (tagCountMap[tagStr] || 0) + 1;
      });
    }
  });

  const avgRating = totalFeedbacks > 0 ? (totalRatingSum / totalFeedbacks).toFixed(1) : "5.0";
  const positiveRate = totalFeedbacks > 0 ? Math.round((positiveCount / totalFeedbacks) * 100) : 100;

  const topTags = Object.entries(tagCountMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const feedbacks = rawFeedbacks.map((f) => ({
    id: f.id,
    rating: f.rating,
    tags: (Array.isArray(f.tags) ? f.tags : []) as string[],
    comment: f.comment,
    counterNo: f.counterNo,
    ticketNo: f.ticket.ticketNo,
    createdAt: f.createdAt.toISOString(),
  }));

  const summary = {
    avgRating,
    positiveRate,
    totalFeedbacks,
    starDistribution,
    topTags,
  };

  return (
    <FeedbackClient
      feedbacks={feedbacks}
      summary={summary}
      branchName={branch?.name || "Cawangan Utama"}
    />
  );
}
