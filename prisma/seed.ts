import "dotenv/config";
import { PrismaClient, GiType, Role, UserStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

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

const adapter = new PrismaPg(new Pool({ connectionString: getDatabaseUrl() }));
const prisma = new PrismaClient({ adapter });

const affiliations = ["Roger Gracie", "Gracie Barra", "Checkmat", "Alliance", "FightZone", "Independent"];
const areas: Array<[string, string, number, number]> = [
  ["Shoreditch", "E1", 51.5245, -0.0769],
  ["Camden", "NW1", 51.539, -0.1426],
  ["Brixton", "SW9", 51.4626, -0.1149],
  ["Hackney", "E8", 51.545, -0.0553],
  ["Wimbledon", "SW19", 51.4214, -0.2064],
  ["Islington", "N1", 51.5362, -0.103],
  ["Clapham", "SW4", 51.4622, -0.1384],
  ["Ealing", "W5", 51.513, -0.3089],
  ["Greenwich", "SE10", 51.4826, -0.0077],
  ["Kingston", "KT1", 51.4123, -0.3007],
];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function main() {
  const passwordHash = await bcrypt.hash("rollfinder-admin", 10);

  await prisma.user.upsert({
    where: { email: "admin@rollfinder.local" },
    update: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE, disabled: false, isProtected: true },
    create: {
      name: "RollFinder Admin",
      email: "admin@rollfinder.local",
      passwordHash,
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isProtected: true,
    },
  });

  const academies = [];

  for (let index = 1; index <= 50; index += 1) {
    const area = areas[(index - 1) % areas.length];
    const name = `${area[0]} BJJ Club ${index}`;
    const latJitter = ((index % 7) - 3) * 0.004;
    const lngJitter = ((index % 5) - 2) * 0.006;

    const academy = await prisma.academy.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        name,
        slug: slugify(name),
        description:
          "A welcoming London Brazilian Jiu-Jitsu academy offering fundamentals, sparring, and open mat sessions for visitors and regulars.",
        affiliation: affiliations[index % affiliations.length],
        website: `https://example.com/${slugify(name)}`,
        email: `hello+${index}@rollfinder.local`,
        phone: `+44 20 7946 ${String(1000 + index)}`,
        address: `${index} Tatami Street`,
        city: "London",
        postcode: `${area[1]} ${index}RF`,
        borough: area[0],
        latitude: Number((area[2] + latJitter).toFixed(6)),
        longitude: Number((area[3] + lngJitter).toFixed(6)),
        logoUrl: null,
        dropInPrice: index % 4 === 0 ? 0 : 12 + (index % 4) * 3,
        giAvailable: index % 3 !== 1,
        nogiAvailable: index % 3 !== 2,
        beginnerFriendly: index % 5 !== 0,
        competitionFocused: index % 6 === 0,
        verified: index <= 12,
      },
    });
    academies.push(academy);
  }

  for (let index = 0; index < 100; index += 1) {
    const academy = academies[index % academies.length];
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + (index % 28) + 1);
    eventDate.setHours(0, 0, 0, 0);

    await prisma.event.create({
      data: {
        academyId: academy.id,
        title: index % 3 === 0 ? "Sunday Open Mat" : index % 3 === 1 ? "No-Gi Open Mat" : "Gi Sparring Session",
        description: "Open to experienced visitors. Bring a clean gi or rashguard, water, and proof of club membership if requested.",
        eventDate,
        startTime: index % 2 === 0 ? "12:00" : "18:30",
        endTime: index % 2 === 0 ? "14:00" : "20:00",
        giType: index % 3 === 0 ? GiType.BOTH : index % 3 === 1 ? GiType.NO_GI : GiType.GI,
        price: index % 4 === 0 ? 0 : 10 + (index % 5) * 2,
        capacity: 20 + (index % 4) * 5,
      },
    });
  }
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
