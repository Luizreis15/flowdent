import { Skeleton } from "@/components/ui/skeleton";

const MobileHomeSkeleton = () => {
  return (
    <div className="min-h-[100dvh] overflow-hidden">
      {/* Hero skeleton */}
      <div className="bg-gradient-to-br from-primary via-acento-600 to-acento-400">
        <div className="px-4 pt-12 pb-10">
          <Skeleton className="h-3 w-32 bg-white/20 mb-2" />
          <Skeleton className="h-7 w-48 bg-white/20" />
          <Skeleton className="h-7 w-24 bg-white/15 rounded-full mt-3" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="bg-background rounded-t-3xl -mt-5 pt-5 px-4 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-card" />
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-card" />
          ))}
        </div>

        {/* Alerts */}
        <Skeleton className="h-16 rounded-card" />

        {/* Agenda list */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[72px] rounded-card" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MobileHomeSkeleton;
