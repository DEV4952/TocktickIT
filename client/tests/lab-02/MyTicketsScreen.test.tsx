import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MyTicketsScreen } from "../../src/components/MyTicketsScreen.js";
import { RequesterContext, RequesterContextType } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Requester, Category, PaginatedTicketsResponse } from "../../src/types.js";

const mockActiveRequester: Requester = {
  id: 1,
  name: "Alex Rivera",
  email: "alex.rivera@toktick.it",
  department: "Engineering",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  isActive: true,
};

const mockCategories: Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockTicketsResponse: PaginatedTicketsResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TIC-20260901-0001",
      title: "Cannot connect to internal VPN gateway",
      description: "Cisco AnyConnect fails handshake.",
      relatedSystem: "VPN",
      status: "OPEN",
      priority: "HIGH",
      categoryId: 4,
      category: { id: 4, name: "Network" },
      requesterId: 1,
      attachmentCount: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 102,
      ticketNumber: "TIC-20260901-0002",
      title: "Figma license request",
      description: "Need enterprise Figma access for Q3 designs.",
      relatedSystem: "Figma",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      categoryId: 3,
      category: { id: 3, name: "Software" },
      requesterId: 1,
      attachmentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  },
  metrics: {
    total: 2,
    open: 1,
    inProgress: 1,
    resolved: 0,
    closed: 0,
  },
};

function renderWithRequester(
  component: React.ReactNode,
  requester: Requester = mockActiveRequester
) {
  const contextValue: RequesterContextType = {
    currentRequester: requester,
    requesters: [mockActiveRequester],
    isLoading: false,
    error: null,
    selectRequester: vi.fn(),
    changeRequester: vi.fn(),
    reloadRequesters: vi.fn().mockResolvedValue(undefined),
  };

  return render(
    <RequesterContext.Provider value={contextValue}>
      {component}
    </RequesterContext.Provider>
  );
}

describe("Lab 2 — MyTicketsScreen Component", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockTicketsResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders My Tickets screen with metrics summary and tickets table", async () => {
    const onNavigate = vi.fn();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={onNavigate} />);

    expect(await screen.findByTestId("my-tickets-screen")).toBeInTheDocument();
    expect(screen.getByTestId("metric-val-total")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-val-open")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-val-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-val-resolved")).toHaveTextContent("0");

    // Tickets in table
    const row101 = screen.getByTestId("ticket-row-101");
    expect(row101).toBeInTheDocument();
    expect(within(row101).getByText("TIC-20260901-0001")).toBeInTheDocument();
    expect(within(row101).getByText("Cannot connect to internal VPN gateway")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-row-102")).toBeInTheDocument();
  });

  it("renders Empty State when requester has zero total tickets", async () => {
    const emptyResponse: PaginatedTicketsResponse = {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      metrics: { total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 },
    };
    vi.spyOn(api, "fetchTickets").mockResolvedValue(emptyResponse);

    const onNavigate = vi.fn();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={onNavigate} />);

    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/You don't have any tickets yet/i)).toBeInTheDocument();

    // Clicking CTA navigates to new ticket form
    const createBtn = screen.getByTestId("empty-create-ticket-btn");
    await userEvent.click(createBtn);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("renders No-Results State when filters yield 0 matching tickets", async () => {
    const noResultsResponse: PaginatedTicketsResponse = {
      data: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      metrics: { total: 5, open: 2, inProgress: 1, resolved: 2, closed: 0 }, // Requester has tickets, but filtered out
    };
    vi.spyOn(api, "fetchTickets").mockResolvedValue(noResultsResponse);

    const user = userEvent.setup();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={vi.fn()} />);

    // Apply search filter
    const searchInput = await screen.findByTestId("search-input");
    await user.type(searchInput, "nonexistent-keyword");
    await user.click(screen.getByTestId("search-submit-btn"));

    expect(await screen.findByTestId("no-results-state")).toBeInTheDocument();
    expect(screen.getByText(/No Matching Tickets Found/i)).toBeInTheDocument();
    expect(screen.getByTestId("no-results-clear-btn")).toBeInTheDocument();
  });

  it("renders API Error State when fetch fails and provides a retry mechanism", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("Database connection timed out."));

    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={vi.fn()} />);

    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText(/Unable to Load Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Database connection timed out/i)).toBeInTheDocument();

    // Retry
    fetchSpy.mockResolvedValueOnce(mockTicketsResponse);
    await userEvent.click(screen.getByTestId("retry-btn"));

    expect(await screen.findByTestId("tickets-table")).toBeInTheDocument();
  });

  it("triggers search and updates query parameters", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={vi.fn()} />);

    const searchInput = await screen.findByTestId("search-input");
    await user.type(searchInput, "VPN");
    await user.click(screen.getByTestId("search-submit-btn"));

    expect(fetchSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        search: "VPN",
        page: 1,
      })
    );
  });

  it("filters tickets when selecting a status or priority from dropdowns", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets");
    const user = userEvent.setup();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={vi.fn()} />);

    await screen.findByTestId("tickets-table");

    // Select Status: OPEN
    await user.selectOptions(screen.getByTestId("filter-status-select"), "OPEN");
    expect(fetchSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "OPEN",
      })
    );

    // Select Priority: HIGH
    await user.selectOptions(screen.getByTestId("filter-priority-select"), "HIGH");
    expect(fetchSpy).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        priority: "HIGH",
      })
    );
  });

  it("opens and closes the TicketDetailModal when viewing ticket details", async () => {
    const mockDetailTicket = {
      id: 101,
      ticketNumber: "TIC-20260901-0001",
      title: "Cannot connect to internal VPN gateway",
      description: "Full diagnostic description of VPN handshake issue.",
      relatedSystem: "Cisco AnyConnect",
      status: "OPEN",
      priority: "HIGH",
      categoryId: 4,
      category: { id: 4, name: "Network" },
      requesterId: 1,
      requester: mockActiveRequester,
      attachments: [
        {
          id: 1,
          fileName: "vpn-log.txt",
          fileSize: 1024,
          fileType: "text/plain",
          fileUrl: "/uploads/vpn-log.txt",
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockDetailTicket);

    const user = userEvent.setup();
    renderWithRequester(<MyTicketsScreen onNavigateToNewTicket={vi.fn()} />);

    await screen.findByTestId("tickets-table");

    // Click "View Details" button on row
    await user.click(screen.getByTestId("view-ticket-btn-101"));

    // Modal should open
    expect(await screen.findByTestId("ticket-detail-modal")).toBeInTheDocument();
    expect(screen.getByTestId("detail-ticket-number")).toHaveTextContent("TIC-20260901-0001");
    expect(screen.getByTestId("detail-ticket-description")).toHaveTextContent("Full diagnostic description of VPN handshake issue.");
    expect(screen.getByTestId("attachment-row-1")).toHaveTextContent("vpn-log.txt");

    // Close modal
    await user.click(screen.getByTestId("close-modal-btn"));
    expect(screen.queryByTestId("ticket-detail-modal")).not.toBeInTheDocument();
  });
});
