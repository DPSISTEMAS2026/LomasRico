export default function DashboardLoading() {
  return (
    <div className="relative">
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 animate-[shimmer_1s_ease-in-out_infinite] w-1/3" 
          style={{ animation: 'shimmer 1s ease-in-out infinite' }} />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      <div className="p-4 md:p-10 max-w-7xl mx-auto w-full">
        {/* Minimal skeleton - just enough to prevent layout shift */}
        <div className="animate-pulse">
          <div className="h-10 w-56 bg-slate-100 rounded-2xl mb-2" />
          <div className="h-3 w-80 bg-slate-50 rounded-lg mb-8" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100">
                <div className="h-3 w-20 bg-slate-50 rounded mb-3" />
                <div className="h-8 w-28 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-100">
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-50 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 w-2/3 bg-slate-50 rounded mb-2" />
                    <div className="h-3 w-1/3 bg-slate-50/50 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
