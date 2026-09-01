import { getPrisma } from "../src/prisma.js";

async function main() {
  const prisma = getPrisma();

  // 1. Categories
  const categories = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${categories.length} categories.`);

  // 2. Development Requesters (4 active, 1 inactive)
  const users = [
    {
      name: "Alex Rivera",
      email: "alex.rivera@toktick.it",
      department: "Engineering",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      isActive: true,
    },
    {
      name: "Samantha Chen",
      email: "samantha.chen@toktick.it",
      department: "Marketing",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha",
      isActive: true,
    },
    {
      name: "Marcus Vance",
      email: "marcus.vance@toktick.it",
      department: "Finance",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      isActive: true,
    },
    {
      name: "Elena Rostova",
      email: "elena.rostova@toktick.it",
      department: "Design",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
      isActive: true,
    },
    {
      name: "Jordan Taylor",
      email: "jordan.taylor@toktick.it",
      department: "Operations",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
      isActive: false,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        department: user.department,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
      },
      create: user,
    });
  }

  console.log(`Seeded ${users.length} development users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
