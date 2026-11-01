import React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup, screen, waitFor, fireEvent, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import type { ActionTaken, Role, User } from "../../src/types.js";
const staff: User = { id: 3, name: "Current staff", role: "IT_STAFF", email: "staff@example.test", isActive: true, mustChangePassword: false };
const original = { id: 4, name: "Original recorder", role: "IT_STAFF" as const };
const other = { id: 5, name: "Other staff", role: "IT_STAFF" as const };
const initial: ActionTaken = { id: "a", ticketId: 101, status: "RECORDED", assigneeId: 3, assignee: staff, performedById: 4, performedBy: original, actionDateTime: "2026-10-30T10:00:00.000Z", description: "Inspect network configuration", result: "Connection restored", followUpRequired: false, followUpNote: null, attachmentNotes: "See log.txt", createdAt: "2026-10-30T10:00:00.000Z", updatedAt: "2026-10-30T10:00:00.000Z" };
function view(role: Role = "IT_STAFF") {
 const ctx: AuthContextType = { user: { ...staff, role }, token: "mock", isLoading: false, error: null, login: vi.fn(), logout: vi.fn(), changePassword: vi.fn(), refreshUser: vi.fn() };
 return render(<AuthContext.Provider value={ctx}><ActionsTaken ticketId={101} /></AuthContext.Provider>);
}
beforeEach(() => {
 vi.restoreAllMocks();
 vi.spyOn(api, "fetchActionsTaken").mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 1, actions: [{ ...initial }] });
 vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([staff, other]);
 vi.spyOn(api, "createActionTaken").mockResolvedValue({ action: { ...initial, id: "new" } });
 vi.spyOn(api, "updateActionTaken").mockResolvedValue({ action: { ...initial, assigneeId: 5, assignee: other } });
 vi.spyOn(api, "transitionActionTaken").mockResolvedValue({ action: { ...initial, status: "COMPLETED", updatedAt: "2026-10-30T11:00:00.000Z" } });
 vi.spyOn(api, "fetchActionHistory").mockResolvedValue({ history: [{ id: "h", actionId: "a", actorId: 4, actor: original, event: "UPDATED", before: { result: "Previous result" }, after: { result: "Connection restored" }, createdAt: initial.createdAt }] });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("Rubric extension: Action assignment, lifecycle and history UI", () => {
 it("creates with a selected active assignee without forging performer", async () => {
  view(); await userEvent.click(await screen.findByRole("button", { name: "Add Action" }));
  await waitFor(() => expect(screen.getByLabelText("Assigned To")).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Inspect network routing" } }); fireEvent.change(screen.getByLabelText("Result"), { target: { value: "Testing connectivity" } });
  await userEvent.selectOptions(screen.getByLabelText("Assigned To"), "5");
  await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
  expect(api.createActionTaken).toHaveBeenCalledWith(101, expect.objectContaining({ assigneeId: 5 }));
  expect(vi.mocked(api.createActionTaken).mock.calls[0][1]).not.toHaveProperty("performedById");
 });
 it("reassigns while displaying original recorder and sending the version", async () => {
  view(); await userEvent.click(await screen.findByRole("button", { name: /^Edit action:/ }));
  expect(within(screen.getByRole("dialog")).getByText("Original recorder")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText("Assigned To")).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Assigned To"), "5"); await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
  expect(api.updateActionTaken).toHaveBeenCalledWith(101, "a", expect.objectContaining({ assigneeId: 5, currentUpdatedAt: initial.updatedAt }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument()); expect(screen.getByText("Other staff")).toBeInTheDocument();
 });
 it("starts and completes with refreshed concurrency tokens", async () => {
  vi.mocked(api.transitionActionTaken).mockResolvedValueOnce({ action: { ...initial, status: "IN_PROGRESS", updatedAt: "2026-10-30T10:30:00.000Z" } }).mockResolvedValueOnce({ action: { ...initial, status: "COMPLETED", updatedAt: "2026-10-30T11:00:00.000Z" } });
  view(); await userEvent.click(await screen.findByRole("button", { name: "Start action" })); await screen.findByText("IN_PROGRESS");
  expect(api.transitionActionTaken).toHaveBeenNthCalledWith(1, 101, "a", "IN_PROGRESS", initial.updatedAt);
  await userEvent.click(screen.getByRole("button", { name: "Complete action" })); await screen.findByText("COMPLETED");
  expect(api.transitionActionTaken).toHaveBeenNthCalledWith(2, 101, "a", "COMPLETED", "2026-10-30T10:30:00.000Z");
  expect(screen.queryByRole("button", { name: /^Edit action:/ })).not.toBeInTheDocument();
 });
 it("cancels an action without changing the Ticket workflow", async () => {
  vi.mocked(api.transitionActionTaken).mockResolvedValue({ action: { ...initial, status: "CANCELLED" } });
  view(); await userEvent.click(await screen.findByRole("button", { name: "Cancel action" })); expect(await screen.findByText("CANCELLED")).toBeInTheDocument();
  expect(api.transitionActionTaken).toHaveBeenCalledWith(101, "a", "CANCELLED", initial.updatedAt);
 });
 for (const status of ["COMPLETED", "CANCELLED"] as const) it(`terminal ${status} has no edit/transition controls`, async () => {
  vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 1, actions: [{ ...initial, status }] });
  view(); await screen.findByText(status);
  expect(screen.queryByRole("button", { name: /^Edit action:|Start action|Complete action|Cancel action/ })).not.toBeInTheDocument();
 });
 it("Requester sees status/assignment/history with no write controls", async () => {
  view("REQUESTER"); await screen.findByText("RECORDED");
  expect(screen.queryByRole("button", { name: /Add Action|^Edit action:|Start action|Complete action|Cancel action/ })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "View history" })); expect(await screen.findByText("UPDATED")).toBeInTheDocument();
  await userEvent.click(screen.getByText("Before / after")); expect(screen.getByText(/Previous result/)).toBeInTheDocument();
 });
 it("legacy unassigned records cannot start/complete until assigned", async () => {
  vi.mocked(api.fetchActionsTaken).mockResolvedValue({ ticketId: 101, ticketNumber: "TIC", totalActions: 1, actions: [{ ...initial, assigneeId: null, assignee: null }] });
  view(); expect(await screen.findByRole("button", { name: "Start action" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Complete action" })).toBeDisabled(); expect(screen.getByRole("button", { name: "Cancel action" })).toBeEnabled();
 });
 it("assignee loading failure preserves form values and prevents saving", async () => {
  vi.mocked(api.fetchAssignableStaffApi).mockRejectedValue(new Error("Offline"));
  view(); await userEvent.click(await screen.findByRole("button", { name: "Add Action" })); await screen.findByText(/Unable to load active assignees/);
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Keep my description" } }); expect(screen.getByRole("button", { name: "Save Action" })).toBeDisabled(); expect(screen.getByLabelText("Description")).toHaveValue("Keep my description");
 });
 it("inactive-assignee backend rejection preserves the chosen assignment and content", async () => {
  vi.mocked(api.updateActionTaken).mockRejectedValue(new api.ActionsApiError(400, "Assignee must be active"));
  view(); await userEvent.click(await screen.findByRole("button", { name: /^Edit action:/ })); await waitFor(() => expect(screen.getByLabelText("Assigned To")).toBeEnabled());
  await userEvent.selectOptions(screen.getByLabelText("Assigned To"), "5"); await userEvent.click(screen.getByRole("button", { name: "Save Action" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Assignee must be active"); expect(screen.getByLabelText("Assigned To")).toHaveValue("5"); expect(screen.getByLabelText("Description")).toHaveValue(initial.description);
 });
 it("status conflicts do not retry or overwrite and require explicit reload", async () => {
  vi.mocked(api.transitionActionTaken).mockRejectedValue(new api.ActionsApiError(409, "Action changed. Reload actions."));
  view(); await userEvent.click(await screen.findByRole("button", { name: "Complete action" })); expect(await screen.findByRole("alert")).toHaveTextContent("Reload actions");
  expect(screen.getByRole("button", { name: "Complete action" })).toBeDisabled(); expect(api.transitionActionTaken).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "Reload actions" })); await waitFor(() => expect(screen.getByRole("button", { name: "Complete action" })).toBeEnabled());
 });
 it("prevents duplicate lifecycle submissions", async () => {
  let resolve!: (value: { action: ActionTaken }) => void; vi.mocked(api.transitionActionTaken).mockReturnValue(new Promise(r => { resolve = r; }));
  view(); const button = await screen.findByRole("button", { name: "Complete action" }); fireEvent.click(button); fireEvent.click(button);
  expect(api.transitionActionTaken).toHaveBeenCalledTimes(1); expect(button).toBeDisabled(); await act(async () => { resolve({ action: { ...initial, status: "COMPLETED" } }); });
 });
 it("handles history load failure with retry", async () => {
  vi.mocked(api.fetchActionHistory).mockRejectedValueOnce(new Error("Offline")); view(); await userEvent.click(await screen.findByRole("button", { name: "View history" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load action history"); await userEvent.click(screen.getByRole("button", { name: "Retry history" })); expect(await screen.findByText("UPDATED")).toBeInTheDocument();
 });
});
