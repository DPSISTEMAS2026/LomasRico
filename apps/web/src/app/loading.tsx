export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header skeleton */}
      <div className="bg-white/80 border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-[70px] h-[70px] bg-slate-100 rounded-2xl animate-pulse" />
            <div className="hidden sm:block space-y-2">
              <div className="h-6 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-24 bg-slate-100 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-slate-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Banner skeleton */}
      <div className="h-48 md:h-64 bg-slate-100 animate-pulse" />

      {/* Product grid skeleton */}
      <div className="max-w-7xl mx-auto px-6 py-8 w-full">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
                <div className="h-5 w-1/3 bg-slate-100 rounded animate-pulse mt-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
