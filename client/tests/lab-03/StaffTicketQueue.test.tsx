import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketQueueScreen } from "../../src/components/StaffTicketQueueScreen";
import * as api from "../../src/api";
import * as AuthContextModule from "../../src/context/AuthContext";
import type { StaffTicketQueueResponse, Category } from "../../src/types";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchStaffTickets: vi.fn(),
    fetchCategories: vi.fn(),
    claimTicketApi: vi.fn(),
  };
});

describe("Lab 3 — StaffTicketQueue Component Tests (AC-05 / UI-03)", () => {
  const mockStaffUser = {
    id: 10,
    name: "Staff Person",
    fullName: "Staff Person",
    email: "staff@toktick.it",
    department: "IT Support",
    role: "IT_STAFF" as const,
    isActive: true,
    mustChangePassword: false,
  };

  const mockCategories: Category[] = [
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
    { id: 3, name: "Network" },
  ];

  const mockQueueResponse: StaffTicketQueueResponse = {
    data: [
      {
        id: 101,
        ticketNumber: "TIC-20260901-0101",
        title: "VPN handshake failure",
        description: "Cannot connect to VPN from home office",
        status: "NEW",
        priority: "HIGH",
        itPriority: "URGENT",
        categoryId: 3,
        category: { id: 3, name: "Network" },
        requesterId: 1,
        requester: {
          id: 1,
          name: "Alice User",
          email: "alice@example.com",
          department: "Sales",
          isActive: true,
        },
        ownerId: null,
        owner: null,
        attachments: [],
        createdAt: "2026-09-01T10:00:00.000Z",
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
      {
        id: 102,
        ticketNumber: "TIC-20260901-0102",
        title: "Keyboard key sticking",
        description: "MacBook spacebar issue",
        status: "IN_PROGRESS",
        priority: "LOW",
        itPriority: "LOW",
        categoryId: 1,
        category: { id: 1, name: "Hardware" },
        requesterId: 2,
        requester: {
          id: 2,
          name: "Bob User",
          email: "bob@example.com",
          department: "Design",
          isActive: true,
        },
        ownerId: 10,
        owner: {
          id: 10,
          name: "Staff Person",
          email: "staff@toktick.it",
          role: "IT_STAFF",
        },
        attachments: [],
        createdAt: "2026-09-02T11:00:00.000Z",
        updatedAt: "2026-09-02T11:30:00.000Z",
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    },
    counts: {
      all: 2,
      unassigned: 1,
      myTickets: 1,
      inProgress: 1,
    },
  };

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
    vi.mocked(api.fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.fetchStaffTickets).mockResolvedValue(mockQueueResponse);
  });

  it("UI-03: renders Queue table with operational metrics cards and ticket rows", async () => {
    const onViewTicket = vi.fn();
    render(<StaffTicketQueueScreen onViewTicket={onViewTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-queue")).toBeInTheDocument();
    });

    // Check count cards
    expect(screen.getByTestId("metric-all-tickets")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-unassigned-tickets")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-my-tickets")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-in-progress-tickets")).toHaveTextContent("1");

    // Check rows rendered
    expect(screen.getByTestId("queue-row-101")).toBeInTheDocument();
    expect(screen.getByTestId("queue-row-102")).toBeInTheDocument();

    // Verify claim button visible on unassigned ticket
    expect(screen.getByTestId("claim-btn-101")).toBeInTheDocument();
  });

  it("UI-03b: triggers search query with debounce when typing in search bar", async () => {
    const onViewTicket = vi.fn();
    render(<StaffTicketQueueScreen onViewTicket={onViewTicket} />);

    const searchInput = await screen.findByTestId("queue-search-input");
    fireEvent.change(searchInput, { target: { value: "VPN" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ search: "VPN" })
      );
    });
  });

  it("UI-03c: filters by unassigned status when clicking Unassigned stat card", async () => {
    const onViewTicket = vi.fn();
    render(<StaffTicketQueueScreen onViewTicket={onViewTicket} />);

    const unassignedCard = await screen.findByTestId("metric-unassigned-tickets");
    fireEvent.click(unassignedCard);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: "unassigned" })
      );
    });
  });

  it("AC-06: allows claiming an unassigned ticket directly from the queue", async () => {
    vi.mocked(api.claimTicketApi).mockResolvedValue({
      ticket: { ...mockQueueResponse.data[0], ownerId: 10 },
      message: "Ticket claimed successfully",
    });

    const onViewTicket = vi.fn();
    render(<StaffTicketQueueScreen onViewTicket={onViewTicket} />);

    const claimBtn = await screen.findByTestId("claim-btn-101");
    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(api.claimTicketApi).toHaveBeenCalledWith(101);
    });
  });

  it("calls onViewTicket when clicking ticket row", async () => {
    const onViewTicket = vi.fn();
    render(<StaffTicketQueueScreen onViewTicket={onViewTicket} />);

    const row = await screen.findByTestId("queue-row-101");
    fireEvent.click(row);

    expect(onViewTicket).toHaveBeenCalledWith(101);
  });
});
