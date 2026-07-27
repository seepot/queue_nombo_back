export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-48" />
      </div>
      <div className="p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3 border-b border-gray-100 last:border-0">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 p-6 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  );
}

export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Title */}
      <div className="mb-8">
        <div className="h-7 bg-gray-200 rounded w-64 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-80" />
      </div>

      {/* Cards row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Table */}
      <TableSkeleton />
    </div>
  );
}
