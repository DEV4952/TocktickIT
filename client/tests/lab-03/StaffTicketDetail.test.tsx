import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen";
import * as api from "../../src/api";
import * as AuthContextModule from "../../src/context/AuthContext";
import type { Ticket, Role } from "../../src/types";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchTicketById: vi.fn(),
    fetchTicketAttachments: vi.fn(),
    claimTicketApi: vi.fn(),
    reassignTicketApi: vi.fn(),
    updateTicketPriorityApi: vi.fn(),
    updateTicketStatusApi: vi.fn(),
    fetchAssignableStaffApi: vi.fn(),
    fetchTicketComments: vi.fn(),
    createTicketComment: vi.fn(),
    fetchTicketInternalNotes: vi.fn(),
    createTicketInternalNote: vi.fn(),
  };
});

describe("Lab 3 — StaffTicketDetail Component Tests (AC-06 / AC-07 / UI-04 / UI-05)", () => {
  const mockStaffUser = {
    id: 10,
    name: "Staff Person",
    fullName: "Staff Person",
    email: "staff@toktick.it",
    department: "IT Support",
    role: "IT_STAFF" as Role,
    isActive: true,
    mustChangePassword: false,
  };

  const mockTicket: Ticket = {
    id: 101,
    ticketNumber: "TIC-20260901-0101",
    title: "Cannot connect to internal VPN gateway",
    description: "Handshake fails on Cisco AnyConnect",
    status: "OPEN",
    priority: "HIGH",
    itPriority: "HIGH",
    categoryId: 1,
    category: { id: 1, name: "Network" },
    requesterId: 5,
    requester: {
      id: 5,
      name: "Alex Requester",
      email: "alex@example.com",
      department: "Engineering",
      isActive: true,
    },
    ownerId: null,
    owner: null,
    problemAppearsResolved: false,
    attachments: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };

  const mockAssignableStaff = [
    { id: 10, name: "Staff Person", email: "staff@toktick.it", role: "IT_STAFF" },
    { id: 11, name: "Second Staff", email: "staff2@toktick.it", role: "IT_STAFF" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockStaffUser,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      refreshUser: vi.fn(),
      token: "test-staff-token",
      error: null,
    });
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([]);
    vi.mocked(api.fetchAssignableStaffApi).mockResolvedValue(mockAssignableStaff);
    vi.mocked(api.fetchTicketComments).mockResolvedValue([]);
    vi.mocked(api.fetchTicketInternalNotes).mockResolvedValue([]);
  });

  it("UI-04: renders Operational Triage card with Claim button, IT Priority, and Status controls", async () => {
    const onBack = vi.fn();
    render(<TicketDetailScreen ticketIdOrNumber={101} onBack={onBack} />);

    await waitFor(() => {
      expect(screen.getByTestId("operational-triage-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("detail-claim-btn")).toBeInTheDocument();
    expect(screen.getByTestId("detail-it-priority-select")).toBeInTheDocument();
    expect(screen.getByTestId("detail-status-select")).toBeInTheDocument();
  });

  it("AC-06: allows IT Staff to claim ticket from detail screen", async () => {
    vi.mocked(api.claimTicketApi).mockResolvedValue({
      ticket: { ...mockTicket, ownerId: 10 },
      message: "Claimed",
    });

    const onBack = vi.fn();
    render(<TicketDetailScreen ticketIdOrNumber={101} onBack={onBack} />);

    const claimBtn = await screen.findByTestId("detail-claim-btn");
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(api.claimTicketApi).toHaveBeenCalledWith(101);
    });
  });

  it("AC-07: allows updating IT Priority independently", async () => {
    vi.mocked(api.updateTicketPriorityApi).mockResolvedValue({
      ticket: { ...mockTicket, itPriority: "URGENT" },
      message: "Priority updated",
    });

    const onBack = vi.fn();
    render(<TicketDetailScreen ticketIdOrNumber={101} onBack={onBack} />);

    const prioritySelect = await screen.findByTestId("detail-it-priority-select");
    fireEvent.change(prioritySelect, { target: { value: "URGENT" } });

    await waitFor(() => {
      expect(api.updateTicketPriorityApi).toHaveBeenCalledWith(101, "URGENT");
    });
  });

  it("AC-08: allows updating Ticket Status via permitted state transitions", async () => {
    vi.mocked(api.updateTicketStatusApi).mockResolvedValue({
      ticket: { ...mockTicket, status: "IN_PROGRESS" },
      message: "Status updated",
    });

    const onBack = vi.fn();
    render(<TicketDetailScreen ticketIdOrNumber={101} onBack={onBack} />);

    const statusSelect = await screen.findByTestId("detail-status-select");
    fireEvent.change(statusSelect, { target: { value: "IN_PROGRESS" } });

    await waitFor(() => {
      expect(api.updateTicketStatusApi).toHaveBeenCalledWith(101, "IN_PROGRESS");
    });
  });

  it("UI-05: allows switching between Public Comments and Internal Notes tabs for IT Staff", async () => {
    const onBack = vi.fn();
    render(<TicketDetailScreen ticketIdOrNumber={101} onBack={onBack} />);

    const commentsTab = await screen.findByTestId("tab-public-comments");
    const notesTab = await screen.findByTestId("tab-internal-notes");

    expect(commentsTab).toBeInTheDocument();
    expect(notesTab).toBeInTheDocument();

    // Switch to Internal Notes
    fireEvent.click(notesTab);

    await waitFor(() => {
      expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
    });

    // Switch back to Public Comments
    fireEvent.click(commentsTab);

    await waitFor(() => {
      expect(screen.getByTestId("comments-panel")).toBeInTheDocument();
    });
  });
});
