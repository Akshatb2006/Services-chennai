export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite" className="min-h-dvh bg-porcelain">
      <div className="bg-ink px-5 pb-16 pt-32 sm:px-8">
        <div className="mx-auto max-w-[1320px] animate-pulse">
          <div className="h-4 w-40 rounded-pill bg-white/10" />
          <div className="mt-6 h-14 w-2/3 max-w-xl rounded-md bg-white/10" />
          <div className="mt-5 h-4 w-1/2 max-w-md rounded-pill bg-white/10" />
        </div>
      </div>
      <span className="sr-only">Loading service…</span>
    </div>
  );
}
