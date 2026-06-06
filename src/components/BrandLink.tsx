import Image from "next/image";
import Link from "next/link";

export function BrandLink() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 text-base font-bold text-stone-950">
      <Image
        src="/logo.png"
        alt=""
        width={1672}
        height={941}
        priority
        className="h-11 w-auto shrink-0"
        sizes="120px"
      />
      <span>RollFinders</span>
    </Link>
  );
}
