export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 w-24 rounded-full bg-slate-200" />
        <div className="mt-4 h-8 w-64 rounded-2xl bg-slate-200" />
        <div className="mt-3 h-4 w-full max-w-2xl rounded-full bg-slate-200" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm animate-pulse"
          >
            <div className="h-4 w-28 rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-40 rounded-full bg-slate-200" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-slate-100" />
              <div className="h-6 w-20 rounded-full bg-slate-100" />
            </div>
            <div className="mt-5 h-9 w-full rounded-2xl bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
