import { Skeleton } from "@/components/ui/skeleton";

const EventCardSkeleton = () => (
  <div className="bg-card p-4 rounded-card shadow-card space-y-3">
    <div className="flex justify-between items-start gap-3">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-14 ml-auto" />
      </div>
    </div>
    <div className="flex items-center justify-between pt-3 border-t border-border">
      <Skeleton className="h-5 w-20 rounded-inner" />
      <Skeleton className="h-5 w-16" />
    </div>
  </div>
);

export default EventCardSkeleton;
