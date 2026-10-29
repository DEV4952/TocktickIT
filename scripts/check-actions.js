const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
// Resolve the client generated for the server, even when invoked from repo root.
const serverRequire = createRequire(path.resolve(__dirname, '../server/package.json'));
serverRequire('dotenv').config({ path: path.resolve(__dirname, '../server/.env'), quiet: true });
const { PrismaClient } = serverRequire('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const counts = {};
  for (const model of ['user', 'ticket', 'attachment', 'comment', 'internalNote', 'actionTaken']) {
    counts[model] = await prisma[model].count();
  }
  const tickets = await prisma.ticket.findMany({
    where: { ticketNumber: { in: Array.from({ length: 9 }, (_, i) => `TIC-20260901-${String(i + 1).padStart(4, '0')}`) } },
    include: { actionsTaken: { include: { performedBy: true } } },
    orderBy: { ticketNumber: 'asc' },
  });
  assert.equal(tickets.length, 9, 'Run the seed before checking fixture tickets');
  for (const ticket of tickets) {
    for (const action of ticket.actionsTaken) {
      assert.equal(action.ticketId, ticket.id);
      assert.equal(action.performedById, action.performedBy.id);
      assert.ok(!action.followUpRequired || action.followUpNote?.trim());
    }
  }
  for (const predicate of [n => n === 0, n => n === 1, n => n > 1]) {
    assert.ok(tickets.some(ticket => predicate(ticket.actionsTaken.length)), 'Missing 0/1/multiple action scenario');
  }
  console.log('Database counts:', counts);
  console.table(tickets.map(ticket => ({
    ticket: ticket.ticketNumber, status: ticket.status,
    priority: ticket.priority, actions: ticket.actionsTaken.length,
  })));
  // Match the existing queue's "Assigned to Me" and requester scoping queries.
  for (const email of ['michael.brown@toktick.it', 'john.smith@toktick.it', 'alex.rivera@toktick.it', 'emily.davis@toktick.it']) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    console.log(email, {
      requested: await prisma.ticket.count({ where: { requesterId: user.id } }),
      assigned: await prisma.ticket.count({ where: { ownerId: user.id } }),
    });
  }
  console.log('Actions Taken relations verified (read-only).');
}
main().catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
