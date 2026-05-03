export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-64 rounded-2xl bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse">
            <div className="h-4 w-20 rounded-full bg-slate-200" />
            <div className="mt-4 h-9 w-16 rounded-2xl bg-slate-200" />
            <div className="mt-3 h-3 w-32 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-72 rounded-full bg-slate-200" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
          <div className="h-5 w-32 rounded-full bg-slate-200" />
          <div className="mt-2 h-4 w-60 rounded-full bg-slate-200" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}