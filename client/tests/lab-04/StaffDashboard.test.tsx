import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AppShell } from "../../src/components/AppShell.js";
import { StaffTicketQueueScreen } from "../../src/components/StaffTicketQueueScreen.js";
import * as api from "../../src/api.js";
import { Provider, staffData, requesterData, pending } from "./dashboardFixtures.js";
beforeEach(() => {
 vi.restoreAllMocks(); window.history.replaceState({}, "", "/dashboard");
 vi.spyOn(api, "fetchStaffDashboard").mockResolvedValue(staffData); vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(requesterData);
 vi.spyOn(api, "fetchCategories").mockResolvedValue([]);
 vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }, counts: { all: 0, unassigned: 0, myTickets: 0, inProgress: 0 } });
 vi.spyOn(api, "fetchTickets").mockResolvedValue({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false }, metrics: { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Lab4.8 Staff Dashboard", () => {
 it("renders authoritative values and exact metric destinations", async () => {
  render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>);
  for (const [label, value, href] of [["New", 21, "/staff/queue?status=NEW"], ["Open", 22, "/staff/queue?status=OPEN"], ["In Progress", 23, "/staff/queue?status=IN_PROGRESS"], ["Waiting for Requester", 24, "/staff/queue?status=WAITING_FOR_REQUESTER"], ["My Assigned", 25, "/staff/queue?ownerId=me"]] as const) {
   const link = await screen.findByRole("link", { name: `${label}: ${value} tickets` }); expect(link).toHaveAttribute("href", href); expect(within(link).getByText(String(value))).toBeInTheDocument();
  }
  expect(screen.getByText("-1 created vs yesterday")).toBeInTheDocument(); expect(api.fetchRequesterDashboard).not.toHaveBeenCalled();
 });
 it("shows recent details/status and routes them to ticket detail", async () => {
  render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>); expect(await screen.findByRole("link", { name: /TIC-42 Network issue IN PROGRESS/ })).toHaveAttribute("href", "/tickets/42");
 });
 it("provides Create/Search/My Queue quick actions with matching assignment scope", async () => {
  render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>); await screen.findByText("Network issue");
  expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new"); expect(screen.getByRole("link", { name: "Search Tickets" })).toHaveAttribute("href", "/staff/queue"); expect(screen.getByRole("link", { name: "My Queue" })).toHaveAttribute("href", "/staff/queue?ownerId=me");
 });
 it("shows a successful zero scope and empty state, not a load failure", async () => {
  vi.mocked(api.fetchStaffDashboard).mockResolvedValue({ ...staffData, metrics: Object.fromEntries(Object.keys(staffData.metrics).map(key => [key, 0])) as typeof staffData.metrics, recentTickets: [] });
  render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>); expect(await screen.findAllByRole("link", { name: /: 0 tickets$/ })).toHaveLength(5); expect(screen.getByText(/No recent tickets/)).toBeInTheDocument();
 });
 it("shows loading placeholders without zero counts", () => {
  vi.mocked(api.fetchStaffDashboard).mockReturnValue(new Promise(() => {})); render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard"); expect(screen.queryByRole("link", { name: /0 tickets/ })).not.toBeInTheDocument(); expect(screen.queryByText(/No recent tickets/)).not.toBeInTheDocument();
 });
 it("supports error/retry without exposing fake zero metrics", async () => {
  vi.mocked(api.fetchStaffDashboard).mockRejectedValueOnce(new Error("Disconnected")); render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Disconnected"); expect(screen.queryByRole("link", { name: /tickets$/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry dashboard" })); expect(await screen.findByRole("link", { name: "New: 21 tickets" })).toBeInTheDocument();
 });
 for (const code of [401, 403]) it(`handles HTTP ${code}`, async () => {
  vi.mocked(api.fetchStaffDashboard).mockRejectedValue(new api.DashboardApiError(code, "Denied")); render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>);
  expect(await screen.findByRole("alert")).toHaveTextContent(code === 401 ? "session has expired" : "do not have permission");
 });
 it("preserves Administrator conventions and shows account counts only for Admin", async () => {
  vi.mocked(api.fetchStaffDashboard).mockResolvedValue({ ...staffData, userMetrics: { totalUsers: 10, activeUsers: 8, inactiveUsers: 2, requesterCount: 5, itStaffCount: 3, adminCount: 2 } });
  const result = render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>); await screen.findByText("Network issue"); expect(screen.queryByRole("region", { name: "Administrator account statistics" })).not.toBeInTheDocument();
  result.rerender(<Provider role="ADMINISTRATOR"><StaffDashboard /></Provider>); expect(await screen.findByRole("region", { name: "Administrator account statistics" })).toHaveTextContent("Total users10");
 });
 it("does not render privileged data/navigation for Requesters or loading sessions", () => {
  const result = render(<Provider role="REQUESTER"><StaffDashboard /></Provider>); expect(screen.getByRole("alert")).toHaveTextContent("appropriate role"); expect(api.fetchStaffDashboard).not.toHaveBeenCalled(); expect(screen.queryByRole("link", { name: "My Queue" })).not.toBeInTheDocument();
  result.rerender(<Provider role="IT_STAFF" isLoading><StaffDashboard /></Provider>); expect(api.fetchStaffDashboard).not.toHaveBeenCalled(); expect(screen.queryByRole("link", { name: "My Queue" })).not.toBeInTheDocument();
 });
 it("invalidates loaded staff data on account changes and ignores stale responses", async () => {
  const first = pending<typeof staffData>(), second = pending<typeof staffData>(); vi.mocked(api.fetchStaffDashboard).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const result = render(<Provider role="IT_STAFF" id={1}><StaffDashboard /></Provider>); result.rerender(<Provider role="IT_STAFF" id={2}><StaffDashboard /></Provider>);
  await act(async () => first.resolve(staffData)); expect(screen.queryByText("Network issue")).not.toBeInTheDocument();
  await act(async () => second.resolve({ ...staffData, metrics: { ...staffData.metrics, myAssignedCount: 99 } })); expect(await screen.findByRole("link", { name: "My Assigned: 99 tickets" })).toBeInTheDocument();
 });
 it("retains long titles and large backend values", async () => {
  const title = "LongTitle".repeat(80); vi.mocked(api.fetchStaffDashboard).mockResolvedValue({ ...staffData, metrics: { ...staffData.metrics, newCount: 123456789 }, recentTickets: [{ ...staffData.recentTickets[0], title }] });
  render(<Provider role="IT_STAFF"><StaffDashboard /></Provider>); expect(await screen.findByRole("link", { name: "New: 123456789 tickets" })).toBeInTheDocument(); expect(screen.getByText(title)).toBeInTheDocument();
 });
});

describe("Dashboard navigation and destination filter integration", () => {
 for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const) it(`routes ${role} Dashboard navigation and marks desktop/mobile links active`, async () => {
  render(<Provider role={role}><AppShell /></Provider>); await screen.findByRole("heading", { name: role === "REQUESTER" ? "Requester Dashboard" : "Staff Dashboard" });
  const links = screen.getAllByRole("link", { name: "Dashboard" }); expect(links).toHaveLength(2); for (const link of links) expect(link).toHaveAttribute("aria-current", "page");
 });
 for (const [label, status, value] of [["New", "NEW", 21], ["Open", "OPEN", 22], ["In Progress", "IN_PROGRESS", 23], ["Waiting for Requester", "WAITING_FOR_REQUESTER", 24]] as const) it(`${label} drills into a queue that actually applies ${status}`, async () => {
  render(<Provider role="IT_STAFF"><AppShell /></Provider>); await userEvent.click(await screen.findByRole("link", { name: `${label}: ${value} tickets` }));
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ status, ownerId: undefined })));
  expect(screen.getByTestId("queue-status-filter")).toHaveValue(status); expect(window.location.search).toBe(`?status=${status}`);
 });
 for (const label of ["My Assigned: 25 tickets", "My Queue"]) it(`${label} applies ownerId=me without an extra status restriction`, async () => {
  render(<Provider role="IT_STAFF"><AppShell /></Provider>); await userEvent.click(await screen.findByRole("link", { name: label }));
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ ownerId: "me", status: undefined })));
  expect(screen.getByTestId("queue-owner-filter")).toHaveValue("me");
 });
 for (const [label, value, filter] of [["My Open Tickets", 11, "OPEN_GROUP"], ["In Progress", 5, "IN_PROGRESS"], ["Resolved", 7, "RESOLVED"], ["Closed", 13, "CLOSED"]] as const) it(`Requester ${label} targets the owned queue with the matching predicate`, async () => {
  render(<Provider><AppShell /></Provider>); await userEvent.click(await screen.findByRole("link", { name: `${label}: ${value} tickets` }));
  await waitFor(() => expect(api.fetchTickets).toHaveBeenCalledWith(1, expect.objectContaining(filter === "OPEN_GROUP" ? { status: "ALL", statusGroup: "open" } : { status: filter })));
  expect(api.fetchStaffTickets).not.toHaveBeenCalled(); expect(screen.getByTestId("filter-status-select")).toHaveValue(filter);
 });
 it("restores dashboard/queue filters through browser back and forward", async () => {
  render(<Provider role="IT_STAFF"><AppShell /></Provider>); await userEvent.click(await screen.findByRole("link", { name: "New: 21 tickets" })); await screen.findByTestId("queue-status-filter");
  await act(async () => window.history.back()); await screen.findByRole("heading", { name: "Staff Dashboard" });
  await act(async () => window.history.forward()); await waitFor(() => expect(screen.getByTestId("queue-status-filter")).toHaveValue("NEW"));
 });
 it("applies filters on direct navigation and remount/refresh", async () => {
  window.history.replaceState({}, "", "/staff/queue?status=WAITING_FOR_REQUESTER&ownerId=me");
  let result = render(<Provider role="IT_STAFF"><StaffTicketQueueScreen onViewTicket={vi.fn()} /></Provider>);
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ status: "WAITING_FOR_REQUESTER", ownerId: "me" })));
  result.unmount(); vi.mocked(api.fetchStaffTickets).mockClear(); result = render(<Provider role="IT_STAFF"><StaffTicketQueueScreen onViewTicket={vi.fn()} /></Provider>);
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ status: "WAITING_FOR_REQUESTER", ownerId: "me" })));
 });
 it("reacts to filter query changes on the same mounted queue", async () => {
  window.history.replaceState({}, "", "/staff/queue?status=NEW"); render(<Provider role="IT_STAFF"><StaffTicketQueueScreen onViewTicket={vi.fn()} /></Provider>);
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenCalledWith(expect.objectContaining({ status: "NEW" })));
  act(() => { window.history.pushState({}, "", "/staff/queue?status=RESOLVED"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await waitFor(() => expect(api.fetchStaffTickets).toHaveBeenLastCalledWith(expect.objectContaining({ status: "RESOLVED" })));
 });
 it("Requester grouped-open filtering survives direct navigation and refresh without trusting URL identity", async () => {
  window.history.replaceState({}, "", "/tickets?statusGroup=open&requesterId=999");
  let result = render(<Provider><AppShell /></Provider>);
  await waitFor(() => expect(api.fetchTickets).toHaveBeenCalledWith(1, expect.objectContaining({ status: "ALL", statusGroup: "open" })));
  expect(screen.getByTestId("filter-status-select")).toHaveValue("OPEN_GROUP");
  result.unmount(); vi.mocked(api.fetchTickets).mockClear(); result = render(<Provider><AppShell /></Provider>);
  await waitFor(() => expect(api.fetchTickets).toHaveBeenCalledWith(1, expect.objectContaining({ statusGroup: "open" })));
 });
 it("recent-ticket links open actual Ticket Detail and return to Dashboard", async () => {
  vi.spyOn(api, "fetchTicketById").mockResolvedValue({ id: 42, ticketNumber: "TIC-42", title: "Network issue", description: "Fixture detail", status: "IN_PROGRESS", priority: "HIGH", categoryId: 1, category: { id: 1, name: "Network" }, requesterId: 1, requester: { id: 1, name: "Requester", email: "req@example.test", isActive: true, department: "IT" }, attachments: [], createdAt: "2026-10-30T10:00:00Z", updatedAt: "2026-10-30T10:00:00Z" });
  vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([]); vi.spyOn(api, "fetchTicketAttachments").mockResolvedValue([]);
  vi.spyOn(api, "fetchTicketComments").mockResolvedValue([]); vi.spyOn(api, "fetchTicketInternalNotes").mockResolvedValue([]);
  vi.spyOn(api, "fetchActionsTaken").mockResolvedValue({ ticketId: 42, ticketNumber: "TIC-42", totalActions: 0, actions: [] });
  render(<Provider role="IT_STAFF"><AppShell /></Provider>);
  await userEvent.click(await screen.findByRole("link", { name: /TIC-42 Network issue/ }));
  expect(await screen.findByTestId("header-ticket-number")).toHaveTextContent("TIC-42");
  expect(api.fetchTicketById).toHaveBeenCalledWith("42", 1);
  await userEvent.click(screen.getByTestId("back-to-tickets-btn"));
  expect(await screen.findByRole("heading", { name: "Staff Dashboard" })).toBeInTheDocument();
 });
 it("keeps privileged navigation hidden while the session is loading", () => {
  render(<Provider role="ADMINISTRATOR" isLoading><AppShell /></Provider>); expect(screen.getByRole("status")).toHaveTextContent("Loading session"); expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
 });
 it("does not render the staff queue for a direct Requester staff-route attempt", async () => {
  window.history.replaceState({}, "", "/staff/queue?ownerId=me"); render(<Provider><AppShell /></Provider>); expect(screen.getByRole("alert")).toHaveTextContent("do not have permission"); expect(api.fetchStaffTickets).not.toHaveBeenCalled();
 });
});

describe("Dashboard API clients with mocked fetch", () => {
 afterEach(() => vi.unstubAllGlobals());
 it("uses the correct endpoints, signed auth and credentials without identity parameters", async () => {
  vi.restoreAllMocks(); localStorage.setItem("toktickit_auth_token", "signed-token");
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => requesterData }); vi.stubGlobal("fetch", fetch);
  await api.fetchRequesterDashboard(); await api.fetchStaffDashboard();
  expect(fetch).toHaveBeenNthCalledWith(1, "/api/dashboard/requester", expect.objectContaining({ credentials: "include", headers: { Authorization: "Bearer signed-token" } }));
  expect(fetch).toHaveBeenNthCalledWith(2, "/api/dashboard/staff", expect.objectContaining({ credentials: "include" }));
  localStorage.clear();
 });
 it("retains HTTP status for expired/forbidden dashboard responses", async () => {
  vi.restoreAllMocks(); vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ message: "Denied" }) }));
  await expect(api.fetchStaffDashboard()).rejects.toMatchObject({ status: 403, message: "Denied" });
 });
});
