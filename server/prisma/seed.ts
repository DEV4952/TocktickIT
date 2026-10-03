import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

async function main() {
  const prisma = getPrisma();

  console.log("Seeding Lab 3 database increment...");

  // 1. Seed Categories
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
  console.log(`✓ Seeded ${categories.length} categories.`);

  // 2. Seed Users (Roles: REQUESTER, IT_STAFF, ADMINISTRATOR)
  // Requirements: >= 4 active Requesters, 1 inactive Requester
  //               >= 3 active IT Staff, 1 inactive IT Staff
  //               >= 1 active Admin, 1 user requiring password change
  const users = [
    // Requesters (4 Active, 1 Inactive, 1 First-Login Change Required)
    {
      name: "Alex Rivera",
      email: "alex.rivera@toktick.it",
      department: "Engineering",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Samantha Chen",
      email: "samantha.chen@toktick.it",
      department: "Marketing",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Marcus Vance",
      email: "marcus.vance@toktick.it",
      department: "Finance",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Elena Rostova",
      email: "elena.rostova@toktick.it",
      department: "Design",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Jordan Taylor",
      email: "jordan.taylor@toktick.it",
      department: "Operations",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
      isActive: false,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Emily Davis",
      email: "emily.davis@toktick.it",
      department: "Human Resources",
      role: "REQUESTER" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      isActive: true,
      mustChangePassword: true, // For First-Login testing
      passwordHash: DEFAULT_HASH,
    },

    // IT Staff (3 Active, 1 Inactive)
    {
      name: "Michael Brown",
      email: "michael.brown@toktick.it",
      department: "IT Support",
      role: "IT_STAFF" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@toktick.it",
      department: "IT Operations",
      role: "IT_STAFF" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "David Lee",
      email: "david.lee@toktick.it",
      department: "Network Operations",
      role: "IT_STAFF" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Kevin Patel",
      email: "kevin.patel@toktick.it",
      department: "IT Support",
      role: "IT_STAFF" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Kevin",
      isActive: false,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },

    // Administrators (2 Active)
    {
      name: "John Smith",
      email: "john.smith@toktick.it",
      department: "System Administration",
      role: "ADMINISTRATOR" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
    {
      name: "Super Administrator",
      email: "admin@toktick.it",
      department: "IT Governance",
      role: "ADMINISTRATOR" as const,
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Admin",
      isActive: true,
      mustChangePassword: false,
      passwordHash: DEFAULT_HASH,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        department: user.department,
        role: user.role,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordHash: user.passwordHash,
      },
      create: user,
    });
  }
  console.log(`✓ Seeded ${users.length} users with credentials (Default password: ${DEFAULT_PASSWORD}).`);

  // 3. Seed Realistic Tickets with Ownership, Priority, Comments, Notes
  const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
  const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });
  const marcus = await prisma.user.findUnique({ where: { email: "marcus.vance@toktick.it" } });
  const michael = await prisma.user.findUnique({ where: { email: "michael.brown@toktick.it" } });
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.johnson@toktick.it" } });
  const david = await prisma.user.findUnique({ where: { email: "david.lee@toktick.it" } });

  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catAccess = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  if (alex && samantha && marcus && michael && sarah && david && catNetwork && catSoftware && catHardware && catAccess) {
    const sampleTickets = [
      {
        ticketNumber: "TIC-20260901-0001",
        title: "Cannot connect to internal VPN gateway",
        description: "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
        relatedSystem: "Cisco AnyConnect VPN",
        status: "OPEN" as const,
        priority: "HIGH" as const,
        itPriority: "HIGH" as const,
        problemAppearsResolved: false,
        categoryId: catNetwork.id,
        requesterId: alex.id,
        ownerId: sarah.id,
        attachments: [
          {
            fileName: "vpn-error-screenshot.png",
            fileSize: 245100,
            fileType: "image/png",
            fileUrl: "/uploads/attachments/vpn-error-screenshot.png",
            isDeleted: false,
          },
        ],
        comments: [
          {
            authorId: sarah.id,
            body: "We have verified your network profile. Please try reconnecting using the alternate gateway IP.",
          },
          {
            authorId: alex.id,
            body: "Connected to alternate gateway. It connects but drops after 5 minutes.",
          },
        ],
        notes: [
          {
            authorId: sarah.id,
            body: "Firewall rule for subnet 192.168.12.0/24 needs adjustment by David.",
          },
        ],
      },
      {
        ticketNumber: "TIC-20260901-0002",
        title: "Request license for Figma Professional",
        description: "Need Figma editor license for upcoming frontend design revamp sprint in Q4.",
        relatedSystem: "Figma",
        status: "OPEN" as const,
        priority: "MEDIUM" as const,
        itPriority: "LOW" as const,
        problemAppearsResolved: false,
        categoryId: catSoftware.id,
        requesterId: alex.id,
        ownerId: null, // Unassigned
        attachments: [
          {
            fileName: "manager-approval.pdf",
            fileSize: 104520,
            fileType: "application/pdf",
            fileUrl: "/uploads/attachments/manager-approval.pdf",
            isDeleted: false,
          },
        ],
        comments: [],
        notes: [],
      },
      {
        ticketNumber: "TIC-20260901-0003",
        title: "MacBook Pro keyboard key sticking",
        description: "The spacebar and 'E' key on the provided M2 MacBook Pro are frequently sticking during typing.",
        relatedSystem: "Hardware / Laptop",
        status: "OPEN" as const,
        priority: "LOW" as const,
        itPriority: "MEDIUM" as const,
        problemAppearsResolved: false,
        categoryId: catHardware.id,
        requesterId: samantha.id,
        ownerId: michael.id,
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
        comments: [
          {
            authorId: michael.id,
            body: "Please bring the device to IT Desk Room 302 between 10am-12pm for quick inspection.",
          },
        ],
        notes: [
          {
            authorId: michael.id,
            body: "Replacement key switches in stock in cabinet B-4.",
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
        itPriority: "HIGH" as const,
        problemAppearsResolved: true,
        categoryId: catAccess.id,
        requesterId: samantha.id,
        ownerId: michael.id,
        attachments: [],
        comments: [
          {
            authorId: samantha.id,
            body: "Problem appears resolved. MFA reset SMS received and verified.",
          },
        ],
        notes: [
          {
            authorId: michael.id,
            body: "MFA phone updated to +66812345678 after identity confirmation with HR.",
          },
        ],
      },
      {
        ticketNumber: "TIC-20260901-0005",
        title: "Fiscal year end financial reporting database timeout",
        description: "Executing Q3 ledger rollup query terminates with timeout after 120 seconds.",
        relatedSystem: "PostgreSQL Data Warehouse",
        status: "IN_PROGRESS" as const,
        priority: "URGENT" as const,
        itPriority: "URGENT" as const,
        problemAppearsResolved: false,
        categoryId: catSoftware.id,
        requesterId: marcus.id,
        ownerId: david.id,
        attachments: [],
        comments: [
          {
            authorId: david.id,
            body: "Query plan analysis indicates missing composite index on ledger_entries table.",
          },
        ],
        notes: [
          {
            authorId: david.id,
            body: "Scheduled maintenance index build for tonight 22:00 UTC.",
          },
        ],
      },
    ];

    for (const t of sampleTickets) {
      const { attachments, comments, notes, ...ticketData } = t;
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

      // Seed comments if not existing
      for (const c of comments) {
        const existingComment = await prisma.comment.findFirst({
          where: { ticketId: createdTicket.id, body: c.body },
        });
        if (!existingComment) {
          await prisma.comment.create({
            data: {
              ticketId: createdTicket.id,
              authorId: c.authorId,
              body: c.body,
            },
          });
        }
      }

      // Seed notes if not existing
      for (const n of notes) {
        const existingNote = await prisma.internalNote.findFirst({
          where: { ticketId: createdTicket.id, body: n.body },
        });
        if (!existingNote) {
          await prisma.internalNote.create({
            data: {
              ticketId: createdTicket.id,
              authorId: n.authorId,
              body: n.body,
            },
          });
        }
      }
    }

    console.log(`✓ Seeded ${sampleTickets.length} realistic tickets with comments and internal notes.`);
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Database seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
