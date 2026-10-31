import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, cleanup, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import { Provider, requesterData, pending } from "./dashboardFixtures.js";
beforeEach(() => { vi.restoreAllMocks(); window.history.replaceState({}, "", "/dashboard"); vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValue(requesterData); vi.spyOn(api, "fetchStaffDashboard").mockRejectedValue(new Error("Should not be used")); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Lab4.8 Requester Dashboard", () => {
 it("renders exact API metrics and matching requester-only destinations", async () => {
  render(<Provider><RequesterDashboard /></Provider>);
  for (const [label, count, href] of [["My Open Tickets", 11, "/tickets?statusGroup=open"], ["In Progress", 5, "/tickets?status=IN_PROGRESS"], ["Resolved", 7, "/tickets?status=RESOLVED"], ["Closed", 13, "/tickets?status=CLOSED"]] as const) {
   const link = await screen.findByRole("link", { name: `${label}: ${count} tickets` }); expect(link).toHaveAttribute("href", href); expect(within(link).getByText(String(count))).toBeInTheDocument();
  }
  expect(api.fetchRequesterDashboard).toHaveBeenCalledWith(); expect(api.fetchStaffDashboard).not.toHaveBeenCalled();
 });
 it("links recent public ticket summaries to real detail routes with status text and dates", async () => {
  render(<Provider><RequesterDashboard /></Provider>); const link = await screen.findByRole("link", { name: /TIC-42 Network issue IN PROGRESS/ });
  expect(link).toHaveAttribute("href", "/tickets/42"); expect(link.querySelector("time")).toHaveAttribute("datetime", requesterData.recentTickets[0].updatedAt);
 });
 it("shows loading without reporting fabricated zeros or an empty state", () => {
  vi.mocked(api.fetchRequesterDashboard).mockReturnValue(new Promise(() => {})); render(<Provider><RequesterDashboard /></Provider>);
  expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard"); expect(screen.queryByRole("link", { name: /0 tickets/ })).not.toBeInTheDocument(); expect(screen.queryByText(/No recent tickets/)).not.toBeInTheDocument();
 });
 it("renders successful zeros and a helpful empty list", async () => {
  vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({ ...requesterData, metrics: { myOpenTickets: 0, inProgress: 0, resolved: 0, closed: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 }, recentTickets: [] });
  render(<Provider><RequesterDashboard /></Provider>); expect(await screen.findAllByRole("link", { name: /: 0 tickets$/ })).toHaveLength(4); expect(screen.getByText(/No recent tickets/)).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Create a ticket" })).toHaveAttribute("href", "/tickets/new");
 });
 it("handles error/retry without replacing failure with zeros", async () => {
  vi.mocked(api.fetchRequesterDashboard).mockRejectedValueOnce(new Error("Network unavailable")); render(<Provider><RequesterDashboard /></Provider>);
  expect(await screen.findByRole("alert")).toHaveTextContent("Network unavailable"); expect(screen.queryByRole("link", { name: /0 tickets/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Retry dashboard" })); expect(await screen.findByRole("link", { name: "My Open Tickets: 11 tickets" })).toBeInTheDocument();
 });
 for (const status of [401, 403]) it(`handles HTTP ${status} safely`, async () => {
  vi.mocked(api.fetchRequesterDashboard).mockRejectedValue(new api.DashboardApiError(status, "Server error")); render(<Provider><RequesterDashboard /></Provider>);
  expect(await screen.findByRole("alert")).toHaveTextContent(status === 401 ? "session has expired" : "do not have permission");
 });
 it("exposes the correct quick actions and keyboard-usable metric links", async () => {
  render(<Provider><RequesterDashboard /></Provider>); const metric = await screen.findByRole("link", { name: "My Open Tickets: 11 tickets" });
  expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new"); expect(screen.getByRole("link", { name: "View My Tickets" })).toHaveAttribute("href", "/tickets");
  metric.focus(); await userEvent.keyboard("{Enter}"); expect(window.location.pathname + window.location.search).toBe("/tickets?statusGroup=open");
 });
 it("does not fetch or flash data while the session loads", () => {
  render(<Provider isLoading><RequesterDashboard /></Provider>); expect(api.fetchRequesterDashboard).not.toHaveBeenCalled(); expect(screen.queryByRole("link", { name: /tickets$/ })).not.toBeInTheDocument(); expect(screen.queryByRole("link", { name: "Create Ticket" })).not.toBeInTheDocument();
 });
 it("clears previous data immediately on account change and ignores stale responses", async () => {
  const first = pending<typeof requesterData>(), second = pending<typeof requesterData>(); vi.mocked(api.fetchRequesterDashboard).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const result = render(<Provider id={1}><RequesterDashboard /></Provider>); result.rerender(<Provider id={2}><RequesterDashboard /></Provider>);
  await act(async () => first.resolve(requesterData)); expect(screen.queryByText("Network issue")).not.toBeInTheDocument();
  await act(async () => second.resolve({ ...requesterData, recentTickets: [], metrics: { ...requesterData.metrics, myOpenTickets: 99 } })); expect(await screen.findByRole("link", { name: "My Open Tickets: 99 tickets" })).toBeInTheDocument();
 });
 it("does not keep loaded tickets visible after an identity/role change", async () => {
  const result = render(<Provider><RequesterDashboard /></Provider>); await screen.findByText("Network issue");
  result.rerender(<Provider role="IT_STAFF"><RequesterDashboard /></Provider>); expect(screen.queryByText("Network issue")).not.toBeInTheDocument(); expect(screen.getByRole("alert")).toHaveTextContent("appropriate role");
 });
 it("renders long titles and large metric values without truncating data", async () => {
  const title = "LongUnbrokenTitle".repeat(60); vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({ ...requesterData, metrics: { ...requesterData.metrics, myOpenTickets: 123456789 }, recentTickets: [{ ...requesterData.recentTickets[0], title }] });
  render(<Provider><RequesterDashboard /></Provider>); expect(await screen.findByRole("link", { name: "My Open Tickets: 123456789 tickets" })).toBeInTheDocument(); expect(screen.getByText(title)).toBeInTheDocument();
 });
});
