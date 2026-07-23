import Image from "next/image";
import Link from "next/link";

export function BrandLink() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3 text-xl font-black text-slate-950">
      <Image
        src="/logo.png"
        alt=""
        width={1672}
        height={941}
        priority
        className="size-11 shrink-0 rounded-full object-cover"
        sizes="44px"
      />
      <span>RollFinders</span>
    </Link>
  );
}
