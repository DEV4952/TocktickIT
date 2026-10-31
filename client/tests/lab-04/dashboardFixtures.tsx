import React from "react";
import { vi } from "vitest";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import type { Role, RequesterDashboardData, StaffDashboardData } from "../../src/types.js";
export const requesterData: RequesterDashboardData = {
 referenceTime: "2026-10-31T10:00:00.000Z", windowStart: "2026-10-24T10:00:00.000Z",
 metrics: { myOpenTickets: 11, waitingForRequester: 2, recentlyUpdated: 3, recentlyResolved: 4, inProgress: 5, resolved: 7, closed: 13 },
 recentTickets: [{ id: 42, ticketNumber: "TIC-42", title: "Network issue", status: "IN_PROGRESS", updatedAt: "2026-10-30T10:00:00.000Z" }],
};
export const staffData: StaffDashboardData = {
 referenceTime: requesterData.referenceTime, windowStart: requesterData.windowStart,
 metrics: { newCount: 21, openCount: 22, inProgressCount: 23, waitingRequesterCount: 24, myAssignedCount: 25, unassignedCount: 26, newDelta: 1, openDelta: -1, inProgressDelta: 0, waitingRequesterDelta: 0, myAssignedDelta: 2 },
 breakdowns: { byStatus: { NEW: 21, OPEN: 22, IN_PROGRESS: 23, WAITING_FOR_REQUESTER: 24, RESOLVED: 1, CLOSED: 1, REOPENED: 1, CANCELLED: 1 }, byPriority: { LOW: 1, MEDIUM: 1, HIGH: 1, URGENT: 1 } },
 recentTickets: requesterData.recentTickets,
};
export function session(role: Role = "REQUESTER", id = 1, isLoading = false): AuthContextType {
 return { user: { id, role, name: "Test user", email: "test@example.test", isActive: true, mustChangePassword: false }, token: `mock-${id}`, isLoading, error: null, login: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), refreshUser: vi.fn() };
}
export function Provider({ children, role = "REQUESTER", id = 1, isLoading = false }: { children: React.ReactNode; role?: Role; id?: number; isLoading?: boolean }) {
 return <AuthContext.Provider value={session(role, id, isLoading)}>{children}</AuthContext.Provider>;
}
export function pending<T>() { let resolve!: (data: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
