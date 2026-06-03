import { NextResponse } from "next/server";
import { AcademyVerificationStatus, type Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { academySchema } from "@/lib/validators";

const supportedPageSizes = [20, 50, 100];

function param(url: URL, key: string) {
  return url.searchParams.get(key)?.trim() ?? "";
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number(value || fallback);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parsePageSize(value: string) {
  const parsed = parsePositiveInt(value, 20);
  return supportedPageSizes.includes(parsed) ? parsed : 20;
}

function parseVerificationStatus(value: string) {
  return Object.values(AcademyVerificationStatus).includes(value as AcademyVerificationStatus)
    ? value as AcademyVerificationStatus
    : null;
}

async function academyExists(name: string, address: string, postcode: string) {
  return prisma.academy.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
      address: { equals: address.trim(), mode: "insensitive" },
      postcode: { equals: postcode.trim(), mode: "insensitive" },
    },
    select: { id: true },
  });
}

function toNullable(value: string | null | undefined) {
  return value ? value : null;
}

function toNullableNumber(value: number | "" | undefined) {
  return value === "" || value === undefined ? null : value;
}

export async function GET(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const url = new URL(request.url);
  const page = parsePositiveInt(param(url, "page"), 1);
  const pageSize = parsePageSize(param(url, "pageSize"));
  const search = param(url, "search");
  const verificationStatus = parseVerificationStatus(param(url, "verificationStatus"));
  const featured = param(url, "featured");
  const city = param(url, "city");
  const postcode = param(url, "postcode");

  const where: Prisma.AcademyWhereInput = {
    ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(featured === "featured" ? { featured: true } : {}),
    ...(featured === "not-featured" ? { featured: false } : {}),
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    ...(postcode ? { postcode: { contains: postcode, mode: "insensitive" } } : {}),
  };

  const totalItems = await prisma.academy.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const items = await prisma.academy.findMany({
    where,
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({
    items,
    page: currentPage,
    pageSize,
    totalItems,
    totalPages,
  });
}

export async function POST(request: Request) {
  const forbidden = await requireAdminApi();
  if (forbidden) return forbidden;

  const formData = await request.formData();
  const parsed = academySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return NextResponse.json({ error: "Invalid academy" }, { status: 400 });

  const data = parsed.data;
  const duplicate = await academyExists(data.name, data.address, data.postcode);
  if (duplicate) {
    return NextResponse.json({ error: "Academy already exists for this name, address, and postcode" }, { status: 409 });
  }

  await prisma.academy.create({
    data: {
      ...data,
      borough: toNullable(data.borough),
      website: toNullable(data.website),
      email: toNullable(data.email),
      logoUrl: toNullable(data.logoUrl),
      coverImageUrl: toNullable(data.coverImageUrl),
      categories: toNullable(data.categories),
      facebookUrl: toNullable(data.facebookUrl),
      instagramUrl: toNullable(data.instagramUrl),
      xUrl: toNullable(data.xUrl),
      dropInPrice: toNullableNumber(data.dropInPrice),
      verified: data.verificationStatus === AcademyVerificationStatus.VERIFIED,
    },
  });

  return NextResponse.redirect(new URL("/admin/academies", request.url), { status: 303 });
}
