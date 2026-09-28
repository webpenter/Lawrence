import { Skeleton } from '@/components/ui/Skeleton';
import { layout } from '@/tokens/layout';

// Skeletons with identical dimensions to results (§10.2): a 150px/3:2 image
// cell and four text lines per row — zero layout shift when data lands.
export default function SearchLoading() {
  return (
    <div className="grid lg:grid-cols-[1.25fr_1fr]" style={{ minHeight: layout.searchSplitMinH }}>
      <section className="bg-bone px-5 py-4">
        <div className="mb-3 flex items-baseline justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="grid gap-4 border border-line bg-vellum p-3"
              style={{ gridTemplateColumns: `${layout.searchRowImageW} 1fr` }}
            >
              <div className="relative aspect-[3/2]">
                <Skeleton className="absolute inset-0" />
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="mt-auto h-4 w-28" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="hidden lg:block">
        <Skeleton className="h-full rounded-none" style={{ minHeight: layout.searchSplitMinH }} />
      </aside>
    </div>
  );
}
