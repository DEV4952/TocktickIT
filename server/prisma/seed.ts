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

  // 3. Sample Tickets & Attachments
  const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
  const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });
  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catAccess = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  if (alex && samantha && catNetwork && catSoftware && catHardware && catAccess) {
    const sampleTickets = [
      {
        ticketNumber: "TIC-20260901-0001",
        title: "Cannot connect to internal VPN gateway",
        description: "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
        relatedSystem: "Cisco AnyConnect VPN",
        status: "OPEN" as const,
        priority: "HIGH" as const,
        categoryId: catNetwork.id,
        requesterId: alex.id,
        attachments: [
          {
            fileName: "vpn-error-screenshot.png",
            fileSize: 245100,
            fileType: "image/png",
            fileUrl: "/uploads/attachments/vpn-error-screenshot.png",
            isDeleted: false,
          },
        ],
      },
      {
        ticketNumber: "TIC-20260901-0002",
        title: "Request license for Figma Professional",
        description: "Need Figma editor license for upcoming frontend design revamp sprint in Q4.",
        relatedSystem: "Figma",
        status: "IN_PROGRESS" as const,
        priority: "MEDIUM" as const,
        categoryId: catSoftware.id,
        requesterId: alex.id,
        attachments: [
          {
            fileName: "manager-approval.pdf",
            fileSize: 104520,
            fileType: "application/pdf",
            fileUrl: "/uploads/attachments/manager-approval.pdf",
            isDeleted: false,
          },
        ],
      },
      {
        ticketNumber: "TIC-20260901-0003",
        title: "MacBook Pro keyboard key sticking",
        description: "The spacebar and 'E' key on the provided M2 MacBook Pro are frequently sticking during typing.",
        relatedSystem: "Hardware / Laptop",
        status: "OPEN" as const,
        priority: "LOW" as const,
        categoryId: catHardware.id,
        requesterId: samantha.id,
        attachments: [
          {
            fileName: "old-diagnostic-log.txt",
            fileSize: 12040,
            fileType: "text/plain",
            fileUrl: "/uploads/attachments/old-diagnostic-log.txt",
            isDeleted: true,
            deletedAt: new Date(),
          },
        ],
      },
      {
        ticketNumber: "TIC-20260901-0004",
        title: "Password reset for Marketing analytics portal",
        description: "Locked out of Google Analytics 360 / Looker dashboard due to MFA phone number change.",
        relatedSystem: "Looker / Google Analytics",
        status: "RESOLVED" as const,
        priority: "URGENT" as const,
        categoryId: catAccess.id,
        requesterId: samantha.id,
        attachments: [],
      },
    ];

    for (const t of sampleTickets) {
      const { attachments, ...ticketData } = t;
      const createdTicket = await prisma.ticket.upsert({
        where: { ticketNumber: ticketData.ticketNumber },
        update: ticketData,
        create: ticketData,
      });

      // Seed attachments if not existing
      for (const att of attachments) {
        const existingAtt = await prisma.attachment.findFirst({
          where: { ticketId: createdTicket.id, fileName: att.fileName },
        });

        if (!existingAtt) {
          await prisma.attachment.create({
            data: {
              ...att,
              ticketId: createdTicket.id,
            },
          });
        }
      }
    }

    console.log(`Seeded ${sampleTickets.length} sample tickets and attachments.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
