import Link from "next/link";

export function HomeOpenMatCta() {
  return (
    <section className="bg-stone-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-black">Know a local open mat?</h2>
          <p className="mt-1 text-stone-300">Send it to the RollFinders admin so the radar stays useful.</p>
        </div>
        <Link href="/open-mats" className="rounded-md bg-teal-500 px-4 py-3 text-sm font-bold text-stone-950">Open Mat Radar</Link>
      </div>
    </section>
  );
}
