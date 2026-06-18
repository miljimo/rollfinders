import "dotenv/config";
import { PrismaClient, GiType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFile } from "fs/promises";
import path from "path";
import { Pool } from "pg";

type CsvRow = Record<string, string>;
type Mapping = Record<string, string>;

const seedRoot = path.join(process.cwd(), "seed");

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.DB_USER ?? "postgres";
  const password = process.env.DB_PASSWORD ?? "postgres";
  const host = process.env.DB_HOST ?? "127.0.0.1";
  const port = process.env.DB_PORT ?? "54322";
  const name = process.env.DB_NAME ?? "rollfinder";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

const connectionString = getDatabaseUrl();
const adapter = new PrismaPg(
  new Pool({
    connectionString,
    ssl: connectionString.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  }),
);
const prisma = new PrismaClient({ adapter });

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      field = "";
      row = [];
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  const [headers = [], ...dataRows] = rows;

  return dataRows.map((dataRow) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), (dataRow[index] ?? "").trim()])),
  );
}

async function readCsv(fileName: string) {
  const file = await readFile(path.join(seedRoot, fileName), "utf8");
  return parseCsv(file);
}

async function readMapping(fileName: string): Promise<Mapping> {
  const file = await readFile(path.join(seedRoot, "config", fileName), "utf8");
  return JSON.parse(file) as Mapping;
}

function mappedValue(row: CsvRow, mapping: Mapping, field: string) {
  const column = mapping[field];
  return column ? row[column] : "";
}

function optionalString(value: string) {
  return value || null;
}

function numberValue(value: string, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value: string, fallback = false) {
  if (!value) return fallback;
  return ["true", "1", "yes", "y", "on"].includes(value.toLowerCase());
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function enumValue<T extends Record<string, string>>(values: T, value: string, fallback: T[keyof T]) {
  const normalized = value.trim().toUpperCase().replace(/[-\s]+/g, "_");
  return Object.values(values).includes(normalized) ? (normalized as T[keyof T]) : fallback;
}

function dateOnly(value: string) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function timeOnly(value: string, fallback: string) {
  if (!value) return fallback;
  const match = value.match(/(\d{2}:\d{2})/);
  return match?.[1] ?? fallback;
}

async function seedReferenceCsv(fileName: string) {
  const rows = await readCsv(fileName);
  console.log(`Loaded ${rows.length} ${fileName} reference rows`);
}

async function seedUsers() {
  const [rows, mapping] = await Promise.all([readCsv("users.csv"), readMapping("user.mapping.json")]);
  console.log(`Skipped ${rows.length} ${mapping ? "mapped " : ""}users.csv rows; identities are managed by the users service.`);
}

async function seedAcademies() {
  const [rows, mapping] = await Promise.all([readCsv("academies.csv"), readMapping("academy.mapping.json")]);
  const academies = [];

  for (const row of rows) {
    const name = mappedValue(row, mapping, "name");
    if (!name) continue;
    const slug = mappedValue(row, mapping, "slug") || slugify(name);

    const academy = await prisma.academy.upsert({
      where: { slug },
      update: {
        name,
        description: mappedValue(row, mapping, "description") || "Brazilian Jiu-Jitsu academy listed on RollFinder.",
        affiliation: optionalString(mappedValue(row, mapping, "affiliation")),
        website: optionalString(mappedValue(row, mapping, "website")),
        email: optionalString(mappedValue(row, mapping, "email")),
        phone: optionalString(mappedValue(row, mapping, "phone")),
        address: mappedValue(row, mapping, "address"),
        city: mappedValue(row, mapping, "city") || "London",
        postcode: mappedValue(row, mapping, "postcode"),
        borough: optionalString(mappedValue(row, mapping, "borough")),
        country: mappedValue(row, mapping, "country") || "United Kingdom",
        latitude: numberValue(mappedValue(row, mapping, "latitude"), 51.5072),
        longitude: numberValue(mappedValue(row, mapping, "longitude"), -0.1276),
        logoUrl: optionalString(mappedValue(row, mapping, "logoUrl")),
        dropInPrice: optionalNumber(mappedValue(row, mapping, "dropInPrice")),
        giAvailable: booleanValue(mappedValue(row, mapping, "giAvailable"), true),
        nogiAvailable: booleanValue(mappedValue(row, mapping, "nogiAvailable"), true),
        beginnerFriendly: booleanValue(mappedValue(row, mapping, "beginnerFriendly"), true),
        competitionFocused: booleanValue(mappedValue(row, mapping, "competitionFocused"), false),
        verified: booleanValue(mappedValue(row, mapping, "verified"), false),
      },
      create: {
        name,
        slug,
        description: mappedValue(row, mapping, "description") || "Brazilian Jiu-Jitsu academy listed on RollFinder.",
        affiliation: optionalString(mappedValue(row, mapping, "affiliation")),
        website: optionalString(mappedValue(row, mapping, "website")),
        email: optionalString(mappedValue(row, mapping, "email")),
        phone: optionalString(mappedValue(row, mapping, "phone")),
        address: mappedValue(row, mapping, "address"),
        city: mappedValue(row, mapping, "city") || "London",
        postcode: mappedValue(row, mapping, "postcode"),
        borough: optionalString(mappedValue(row, mapping, "borough")),
        country: mappedValue(row, mapping, "country") || "United Kingdom",
        latitude: numberValue(mappedValue(row, mapping, "latitude"), 51.5072),
        longitude: numberValue(mappedValue(row, mapping, "longitude"), -0.1276),
        logoUrl: optionalString(mappedValue(row, mapping, "logoUrl")),
        dropInPrice: optionalNumber(mappedValue(row, mapping, "dropInPrice")),
        giAvailable: booleanValue(mappedValue(row, mapping, "giAvailable"), true),
        nogiAvailable: booleanValue(mappedValue(row, mapping, "nogiAvailable"), true),
        beginnerFriendly: booleanValue(mappedValue(row, mapping, "beginnerFriendly"), true),
        competitionFocused: booleanValue(mappedValue(row, mapping, "competitionFocused"), false),
        verified: booleanValue(mappedValue(row, mapping, "verified"), false),
      },
    });
    academies.push(academy);
  }

  return academies;
}

async function seedOpenMats() {
  const [rows, mapping] = await Promise.all([readCsv("open_mats.csv"), readMapping("openmat.mapping.json")]);

  for (const row of rows) {
    const academyName = mappedValue(row, mapping, "academyName");
    const academySlug = mappedValue(row, mapping, "academySlug") || slugify(academyName);
    const academy = await prisma.academy.findFirst({
      where: { OR: [{ slug: academySlug }, { name: academyName }] },
    });
    if (!academy) continue;

    const title = mappedValue(row, mapping, "title");
    const eventDate = dateOnly(mappedValue(row, mapping, "eventDate") || mappedValue(row, mapping, "startTime"));
    const startTime = timeOnly(mappedValue(row, mapping, "startTime"), "18:30");
    const existing = await prisma.event.findFirst({
      where: { academyId: academy.id, title, eventDate, startTime },
    });
    const data = {
      academyId: academy.id,
      title,
      description: mappedValue(row, mapping, "description") || "Open mat listed on RollFinder.",
      eventDate,
      startTime,
      endTime: timeOnly(mappedValue(row, mapping, "endTime"), "20:00"),
      giType: enumValue(GiType, mappedValue(row, mapping, "giType"), GiType.BOTH),
      price: numberValue(mappedValue(row, mapping, "price"), 0),
      capacity: optionalNumber(mappedValue(row, mapping, "capacity")),
      active: booleanValue(mappedValue(row, mapping, "active"), true),
    };

    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
    } else {
      await prisma.event.create({ data });
    }
  }
}

async function assignStandardUsersToAcademy() {
  const academy = await prisma.academy.findFirst({ orderBy: { name: "asc" } });
  if (!academy) return;
  console.log(`Default academy available for user service assignment: ${academy.name}`);
}

async function main() {
  await seedReferenceCsv("boroughs.csv");
  await seedReferenceCsv("gi_types.csv");
  await seedUsers();
  await seedAcademies();
  await assignStandardUsersToAcademy();
  await seedOpenMats();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
