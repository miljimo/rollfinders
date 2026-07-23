import Link from "next/link";

export function PageFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-600 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p className="flex flex-wrap items-center gap-2">
          <span>RollFinders helps grapplers find their next round in London.</span>
          <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Beta
          </span>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href="/contact">Contact</Link>
          <Link href="/about">About</Link>
          <Link href="/privacy-policy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
