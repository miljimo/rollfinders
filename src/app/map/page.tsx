import Link from "next/link";
import { PageShell } from "@/components/shell";
import { getMapItems } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const academies = await getMapItems();
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const center = "51.5072,-0.1276";

  return (
    <PageShell>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-black text-stone-950">Map</h1>
        <p className="mt-2 text-stone-700">Browse academy and open mat locations across London.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_380px]">
          <div className="min-h-[480px] overflow-hidden rounded-lg border border-stone-200 bg-white">
            {googleKey ? (
              <iframe
                title="London BJJ academies map"
                className="h-[480px] w-full"
                loading="lazy"
                src={`https://www.google.com/maps/embed/v1/search?key=${googleKey}&q=Brazilian%20Jiu%20Jitsu%20London&center=${center}&zoom=11`}
              />
            ) : (
              <div className="map-grid flex h-[480px] items-center justify-center p-6 text-center">
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <p className="font-bold text-stone-950">Google Maps key not configured</p>
                  <p className="mt-2 max-w-sm text-sm text-stone-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the embedded map. Listings remain available below.</p>
                </div>
              </div>
            )}
          </div>
          <div className="grid max-h-[480px] gap-3 overflow-auto pr-1">
            {academies.map((academy) => (
              <Link key={academy.id} href={`/academies/${academy.slug}`} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
                <p className="font-bold text-stone-950">{academy.name}</p>
                <p className="text-sm text-stone-600">{academy.city}, {academy.postcode}</p>
                {academy.events[0] ? <p className="mt-2 text-xs font-semibold text-teal-800">{academy.events[0].title} · {formatDate(academy.events[0].eventDate)}</p> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
