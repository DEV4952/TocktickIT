import { Prisma, TicketPriority, TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";

export const OPEN_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
const RECENT_DAYS = 7;
const RECENT_LIMIT = 5;
const recentSelect = { id: true, ticketNumber: true, title: true, status: true, updatedAt: true } as const;
function times() {
  const referenceTime = new Date(Date.now());
  const windowStart = new Date(referenceTime.getTime() - RECENT_DAYS * 86400000);
  return { referenceTime, windowStart };
}
export async function requesterDashboard(requesterId: number) {
  const { referenceTime, windowStart } = times();
  const owned = { requesterId };
  const recent = { ...owned, updatedAt: { gte: windowStart, lte: referenceTime } };
  return getPrisma().$transaction(async tx => {
    const [myOpenTickets, waitingForRequester, recentlyUpdated, recentlyResolved, inProgress, resolved, closed, recentTickets] = await Promise.all([
      tx.ticket.count({ where: { ...owned, status: { in: OPEN_STATUSES } } }),
      tx.ticket.count({ where: { ...owned, status: "WAITING_FOR_REQUESTER" } }),
      tx.ticket.count({ where: recent }),
      tx.ticket.count({ where: { ...recent, status: "RESOLVED" } }),
      tx.ticket.count({ where: { ...owned, status: "IN_PROGRESS" } }),
      tx.ticket.count({ where: { ...owned, status: "RESOLVED" } }),
      tx.ticket.count({ where: { ...owned, status: "CLOSED" } }),
      tx.ticket.findMany({ where: owned, select: recentSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: RECENT_LIMIT }),
    ]);
    return {
      referenceTime, windowStart,
      metrics: { myOpenTickets, waitingForRequester, recentlyUpdated, recentlyResolved, inProgress, resolved, closed },
      recentTickets,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function staffDashboard(userId: number, isAdministrator: boolean) {
  const { referenceTime, windowStart } = times();
  const dayStart = new Date(referenceTime);
  dayStart.setUTCHours(0, 0, 0, 0);
  const previousDayStart = new Date(dayStart.getTime() - 86400000);
  return getPrisma().$transaction(async tx => {
    const [unassignedCount, myAssignedCount, statuses, priorities, recentTickets] = await Promise.all([
      tx.ticket.count({ where: { ownerId: null } }),
      tx.ticket.count({ where: { ownerId: userId } }),
      tx.ticket.groupBy({ by: ["status"], _count: { _all: true } }),
      tx.ticket.groupBy({ by: ["itPriority"], _count: { _all: true } }),
      tx.ticket.findMany({ select: recentSelect, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: RECENT_LIMIT }),
    ]);
    const byStatus = Object.fromEntries(Object.values(TicketStatus).map(status => [status, 0])) as Record<TicketStatus, number>;
    const byPriority = Object.fromEntries(Object.values(TicketPriority).map(priority => [priority, 0])) as Record<TicketPriority, number>;
    for (const group of statuses) byStatus[group.status] = group._count._all;
    for (const group of priorities) byPriority[group.itPriority] = group._count._all;
    // BR-12 is a creation-cohort comparison using CURRENT status/owner;
    // it is not a reconstruction of yesterday's queue state.
    const [todayStatus, yesterdayStatus, todayAssigned, yesterdayAssigned] = await Promise.all([
      tx.ticket.groupBy({ by: ["status"], where: { createdAt: { gte: dayStart, lte: referenceTime } }, _count: { _all: true } }),
      tx.ticket.groupBy({ by: ["status"], where: { createdAt: { gte: previousDayStart, lt: dayStart } }, _count: { _all: true } }),
      tx.ticket.count({ where: { ownerId: userId, createdAt: { gte: dayStart, lte: referenceTime } } }),
      tx.ticket.count({ where: { ownerId: userId, createdAt: { gte: previousDayStart, lt: dayStart } } }),
    ]);
    // Existing specification Decision 1 requires a neutral zero when yesterday is empty.
    const delta = (today: number, yesterday: number) => yesterday === 0 ? 0 : today - yesterday;
    const statusDelta = (status: TicketStatus) => delta(
      todayStatus.find(row => row.status === status)?._count._all || 0,
      yesterdayStatus.find(row => row.status === status)?._count._all || 0,
    );
    let userMetrics;
    if (isAdministrator) {
      const [totalUsers, activeUsers, roles] = await Promise.all([
        tx.user.count(), tx.user.count({ where: { isActive: true } }),
        tx.user.groupBy({ by: ["role"], _count: { _all: true } }),
      ]);
      const count = (role: string) => roles.find(group => group.role === role)?._count._all || 0;
      userMetrics = { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, requesterCount: count("REQUESTER"), itStaffCount: count("IT_STAFF"), adminCount: count("ADMINISTRATOR") };
    }
    return {
      referenceTime, windowStart,
      metrics: { unassignedCount, myAssignedCount, newCount: byStatus.NEW, openCount: byStatus.OPEN, inProgressCount: byStatus.IN_PROGRESS, waitingRequesterCount: byStatus.WAITING_FOR_REQUESTER, newDelta: statusDelta("NEW"), openDelta: statusDelta("OPEN"), inProgressDelta: statusDelta("IN_PROGRESS"), waitingRequesterDelta: statusDelta("WAITING_FOR_REQUESTER"), myAssignedDelta: delta(todayAssigned, yesterdayAssigned) },
      breakdowns: { byStatus, byPriority }, recentTickets,
      ...(isAdministrator ? { userMetrics } : {}),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
