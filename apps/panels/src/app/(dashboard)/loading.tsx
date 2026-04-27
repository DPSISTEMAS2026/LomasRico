export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto w-full animate-pulse">
      {/* Page title skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-slate-200 rounded-xl mb-2" />
        <div className="h-4 w-72 bg-slate-100 rounded-lg" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
            <div className="h-8 w-32 bg-slate-100 rounded-lg mb-2" />
            <div className="h-3 w-16 bg-slate-50 rounded" />
          </div>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="h-6 w-36 bg-slate-100 rounded-lg mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-12 bg-slate-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-3 w-1/2 bg-slate-50 rounded" />
              </div>
              <div className="h-8 w-20 bg-slate-100 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
