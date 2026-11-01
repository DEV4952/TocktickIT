import "dotenv/config";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_HASH = bcrypt.hashSync(DEFAULT_PASSWORD, 10);

async function main() {
  const prisma = getPrisma();

  console.log("Seeding Lab 4 database increment (Actions Taken & Role Dashboards)...");

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
  console.log(`Seeded ${categories.length} categories.`);

  // 2. Seed Users (Roles: REQUESTER, IT_STAFF, ADMINISTRATOR)
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
      update: {}, // Preserve existing credentials, roles and account state.
      create: user,
    });
  }
  console.log(`Seeded ${users.length} users with credentials (Default password: ${DEFAULT_PASSWORD}).`);

  // 3. Seed Realistic Tickets with Ownership, Priority, Comments, Notes, and Actions Taken
  const alex = await prisma.user.findUnique({ where: { email: "alex.rivera@toktick.it" } });
  const samantha = await prisma.user.findUnique({ where: { email: "samantha.chen@toktick.it" } });
  const marcus = await prisma.user.findUnique({ where: { email: "marcus.vance@toktick.it" } });
  const elena = await prisma.user.findUnique({ where: { email: "elena.rostova@toktick.it" } });
  const michael = await prisma.user.findUnique({ where: { email: "michael.brown@toktick.it" } });
  const sarah = await prisma.user.findUnique({ where: { email: "sarah.johnson@toktick.it" } });
  const david = await prisma.user.findUnique({ where: { email: "david.lee@toktick.it" } });

  const catNetwork = await prisma.category.findUnique({ where: { name: "Network" } });
  const catSoftware = await prisma.category.findUnique({ where: { name: "Software" } });
  const catHardware = await prisma.category.findUnique({ where: { name: "Hardware" } });
  const catAccess = await prisma.category.findUnique({ where: { name: "Account and Access" } });

  if (alex && samantha && marcus && elena && michael && sarah && david && catNetwork && catSoftware && catHardware && catAccess) {
    const now = Date.parse("2026-09-01T12:00:00.000Z");
    const oneHourAgo = new Date(now - 3600000);
    const oneDayAgo = new Date(now - 86400000);
    const twoDaysAgo = new Date(now - 172800000);
    const threeDaysAgo = new Date(now - 259200000);

    const sampleTickets = [
      // 1. Ticket with 2 Actions Taken (Different performers: Sarah owns, David performs Action 2)
      {
        ticketNumber: "TIC-20260901-0001",
        title: "Cannot connect to internal VPN gateway",
        description: "After updating Cisco AnyConnect, the authentication handshake times out with error 403. Rebooted machine twice.",
        relatedSystem: "Cisco AnyConnect VPN",
        status: "IN_PROGRESS" as const,
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
        actions: [
          {
            actionDateTime: twoDaysAgo,
            description: "Conducted remote diagnostic traceroute and inspected SSL handshake cipher suites on VPN concentrator.",
            result: "Discovered client-side TLS 1.3 renegotiation failure on gateway port 443.",
            performedById: sarah.id,
            followUpRequired: true,
            followUpNote: "David to review gateway firewall rules and SSL profile.",
            attachmentNotes: null,
          },
          {
            actionDateTime: oneDayAgo,
            description: "Updated firewall rule for subnet 192.168.12.0/24 and patched AnyConnect profile XML on ASA gateway.",
            result: "Tunnel re-established cleanly; 100 packets transmitted with 0% loss.",
            performedById: david.id, // Different technician (BR-02)
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: "Refer to vpn-error-screenshot.png in attachments.",
          },
        ],
      },

      // 2. Ticket with 0 Actions Taken (Unassigned Open Ticket - verifies clean empty state)
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
        actions: [], // 0 Actions Taken
      },

      // 3. Ticket with 1 Action Taken (Waiting for Requester with Follow-up)
      {
        ticketNumber: "TIC-20260901-0003",
        title: "MacBook Pro keyboard key sticking",
        description: "The spacebar and 'E' key on the provided M2 MacBook Pro are frequently sticking during typing.",
        relatedSystem: "Hardware / Laptop",
        status: "WAITING_FOR_REQUESTER" as const,
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
            deletedAt: new Date(now),
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
        actions: [
          {
            actionDateTime: oneDayAgo,
            description: "Cleaned scissor mechanism using high-pressure air and micro-lubrication.",
            result: "Spacebar and 'E' keys restored to normal tactile resistance.",
            performedById: michael.id,
            followUpRequired: true,
            followUpNote: "User must verify tactile feel upon device pickup before closing ticket.",
            attachmentNotes: null,
          },
        ],
      },

      // 4. Ticket with 1 Action Taken (Resolved Ticket with advisory solved true)
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
        actions: [
          {
            actionDateTime: threeDaysAgo,
            description: "Verified employee national ID with HR records and regenerated Google Authenticator secret key.",
            result: "MFA challenge successfully cleared and initial one-time backup codes dispatched.",
            performedById: michael.id,
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: null,
          },
        ],
      },

      // 5. Ticket with 3 Actions Taken (Multiple actions by different technicians)
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
        actions: [
          {
            actionDateTime: threeDaysAgo,
            description: "Profiled slow query execution using EXPLAIN (ANALYZE, BUFFERS).",
            result: "Identified sequential scan across 14.2 million rows on ledger_entries.",
            performedById: david.id,
            followUpRequired: true,
            followUpNote: "Sarah to prepare migration script with CONCURRENTLY index definition.",
            attachmentNotes: null,
          },
          {
            actionDateTime: twoDaysAgo,
            description: "Synthesized and validated composite index in staging environment.",
            result: "Query response time dropped from 124s down to 340ms.",
            performedById: sarah.id, // Second technician
            followUpRequired: true,
            followUpNote: "David to apply migration during maintenance window.",
            attachmentNotes: "Staging explain output saved in staging-benchmark.txt.",
          },
          {
            actionDateTime: oneHourAgo,
            description: "Executed CREATE INDEX CONCURRENTLY on production cluster and ran VACUUM ANALYZE.",
            result: "Ledger rollup query now completes in 325ms without database locking.",
            performedById: david.id, // Third action
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: null,
          },
        ],
      },

      // 6. Ticket with Status NEW (Unassigned, 0 actions - guarantees NEW metric on dashboard)
      {
        ticketNumber: "TIC-20260901-0006",
        title: "Conference room A projector HDMI audio not functioning",
        description: "Video display works fine on wall projector, but embedded audio is completely silent.",
        relatedSystem: "AV Equipment",
        status: "NEW" as const,
        priority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        problemAppearsResolved: false,
        categoryId: catHardware.id,
        requesterId: alex.id,
        ownerId: null, // Unassigned
        attachments: [],
        comments: [],
        notes: [],
        actions: [],
      },

      // 7. Ticket with Status CLOSED (Owned by Sarah, 1 action)
      {
        ticketNumber: "TIC-20260901-0007",
        title: "Setup ergonomic monitor arm and dual 4K monitors",
        description: "Approved workstation ergonomic upgrade for Design Lead station #4.",
        relatedSystem: "Facilities / IT Hardware",
        status: "CLOSED" as const,
        priority: "LOW" as const,
        itPriority: "LOW" as const,
        problemAppearsResolved: true,
        categoryId: catHardware.id,
        requesterId: elena.id,
        ownerId: sarah.id,
        attachments: [],
        comments: [
          {
            authorId: sarah.id,
            body: "Dual Dell U2723QE monitors mounted and calibrated with DisplayPort 1.4 daisy-chain.",
          },
        ],
        notes: [],
        actions: [
          {
            actionDateTime: threeDaysAgo,
            description: "Assembled Ergotron dual arm, mounted displays, and verified color profile calibration.",
            result: "Workstation setup verified and signed off by user.",
            performedById: sarah.id,
            followUpRequired: false,
            followUpNote: null,
            attachmentNotes: null,
          },
        ],
      },

      // 8. Ticket with Status REOPENED (Owned by Michael, 1 action)
      {
        ticketNumber: "TIC-20260901-0008",
        title: "Intermittent Wi-Fi disconnection on 5th floor South Wing",
        description: "Laptops randomly disconnect from corporate SSID every ~20 minutes.",
        relatedSystem: "Aruba Wi-Fi APs",
        status: "REOPENED" as const,
        priority: "HIGH" as const,
        itPriority: "HIGH" as const,
        problemAppearsResolved: false,
        categoryId: catNetwork.id,
        requesterId: elena.id,
        ownerId: michael.id,
        attachments: [],
        comments: [
          {
            authorId: elena.id,
            body: "Disconnects are still happening this morning after the access point reboot.",
          },
        ],
        notes: [
          {
            authorId: michael.id,
            body: "Suspect channel interference with neighboring commercial building.",
          },
        ],
        actions: [
          {
            actionDateTime: oneDayAgo,
            description: "Rebooted Aruba AP-515 and forced DFS channel switch from 52 to 100.",
            result: "Interference temporarily reduced but roaming drops persist.",
            performedById: michael.id,
            followUpRequired: true,
            followUpNote: "Perform RF spectrum analysis during peak office hours.",
            attachmentNotes: null,
          },
        ],
      },

      // 9. Ticket with Status CANCELLED (Unassigned, 0 actions - guarantees CANCELLED metric)
      {
        ticketNumber: "TIC-20260901-0009",
        title: "Accidental duplicate request for software installation",
        description: "Submitted in error; software was already installed by department manager.",
        relatedSystem: "Software",
        status: "CANCELLED" as const,
        priority: "LOW" as const,
        itPriority: "LOW" as const,
        problemAppearsResolved: false,
        categoryId: catSoftware.id,
        requesterId: marcus.id,
        ownerId: null,
        attachments: [],
        comments: [],
        notes: [],
        actions: [],
      },
    ];

    for (const t of sampleTickets) {
      const { attachments, comments, notes, actions, ...ticketData } = t;
      const createdTicket = await prisma.ticket.upsert({
        where: { ticketNumber: ticketData.ticketNumber },
        update: {}, // Preserve workflow changes from earlier labs.
        create: ticketData,
      });

      // Seed attachments idempotently
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

      // Seed comments idempotently
      for (const c of comments) {
        const existingComment = await prisma.comment.findFirst({
          where: { ticketId: createdTicket.id, authorId: c.authorId, body: c.body },
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

      // Seed notes idempotently
      for (const n of notes) {
        const existingNote = await prisma.internalNote.findFirst({
          where: { ticketId: createdTicket.id, authorId: n.authorId, body: n.body },
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

      // Seed actions taken idempotently
      for (const a of actions) {
        // Adopt actions from earlier seeds without changing their IDs or contents.
        const existing = await prisma.actionTaken.findFirst({
          where: { ticketId: createdTicket.id, description: a.description, performedById: a.performedById },
        });
        if (existing) continue;
        // Stable CUID-shaped fixture ID, independent of sequence IDs.
        const id = "c" + createHash("sha256")
          .update(t.ticketNumber + ":" + a.description)
          .digest("hex").slice(0, 24);
        await prisma.actionTaken.upsert({
          where: { id },
          update: {},
          create: { id, ...a, ticketId: createdTicket.id },
        });
      }
    }

    console.log(`Seeded ${sampleTickets.length} realistic tickets spanning all statuses, priorities, and Actions Taken.`);
  } else {
    throw new Error("Required seed users or categories are missing");
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Database seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
