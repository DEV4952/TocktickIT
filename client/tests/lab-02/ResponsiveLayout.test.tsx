import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AppShell } from "../../src/components/AppShell.js";
import { MyTicketsScreen } from "../../src/components/MyTicketsScreen.js";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Requester, Ticket, Attachment } from "../../src/types.js";

// Mock API layer
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchTickets: vi.fn(),
    fetchTicketById: vi.fn(),
    fetchTicketAttachments: vi.fn(),
    fetchCategories: vi.fn(),
  };
});

describe("Lab 2 — Responsive UI & Layout Tests (AC-08.10 & AC-09.8)", () => {
  const mockRequester: Requester = {
    id: 1,
    name: "Alex Rivera",
    email: "alex.rivera@toktick.it",
    department: "Engineering",
    avatarUrl: null,
    isActive: true,
  };

  const mockTicket: Ticket = {
    id: 101,
    ticketNumber: "TIC-20260901-0001",
    title: "Cannot connect to internal VPN gateway",
    description: "After updating Cisco AnyConnect, authentication handshake times out.",
    relatedSystem: "Cisco AnyConnect",
    status: "OPEN",
    priority: "HIGH",
    categoryId: 4,
    category: { id: 4, name: "Network" },
    requesterId: 1,
    requester: mockRequester,
    attachments: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };

  const setViewport = (width: number, height: number) => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event("resize"));
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCategories).mockResolvedValue([{ id: 4, name: "Network" }]);
    vi.mocked(api.fetchTickets).mockResolvedValue({
      data: [
        {
          id: 101,
          ticketNumber: "TIC-20260901-0001",
          title: "Cannot connect to internal VPN gateway",
          description: "After updating Cisco AnyConnect, authentication handshake times out.",
          status: "OPEN",
          priority: "HIGH",
          categoryId: 4,
          category: { id: 4, name: "Network" },
          requesterId: 1,
          attachmentCount: 1,
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T10:00:00.000Z",
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      metrics: { total: 1, open: 1, inProgress: 0, resolved: 0, closed: 0 },
    });
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([]);
  });

  const renderAppShell = () =>
    render(
      <RequesterContext.Provider
        value={{
          currentRequester: mockRequester,
          requesters: [mockRequester],
          isLoading: false,
          error: null,
          selectRequester: vi.fn(),
          changeRequester: vi.fn(),
          reloadRequesters: vi.fn(),
        }}
      >
        <AppShell />
      </RequesterContext.Provider>
    );

  // ---------------------------------------------------------------------------
  // 1. Desktop Viewport (1280px)
  // ---------------------------------------------------------------------------
  it("renders Desktop layout with 2-column sidebar and desktop table view (1280px)", async () => {
    setViewport(1280, 800);
    renderAppShell();

    // Verify Sidebar Profile Card and Main Workspace Cards
    const profileCard = screen.getByTestId("requester-profile-card");
    const workspaceCard = screen.getByTestId("requester-workspace-card");

    expect(profileCard.closest(".col-12.col-md-4")).not.toBeNull();
    expect(workspaceCard.closest(".col-12.col-md-8")).not.toBeNull();

    // Verify Navigation Links in navbar
    expect(screen.getByTestId("nav-workspace-tab")).toBeInTheDocument();
    expect(screen.getByTestId("nav-new-ticket-tab")).toBeInTheDocument();

    // Verify Desktop Table is in DOM
    await waitFor(() => {
      expect(screen.getByTestId("tickets-table")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Tablet Viewport (768px)
  // ---------------------------------------------------------------------------
  it("renders Tablet layout without horizontal overflow (768px)", async () => {
    setViewport(768, 1024);
    renderAppShell();

    const appShell = screen.getByTestId("app-shell");
    expect(appShell).toHaveClass("min-vh-100");

    await waitFor(() => {
      expect(screen.getByTestId("my-tickets-screen")).toBeInTheDocument();
      expect(screen.getByTestId("metrics-summary-bar")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Mobile Viewport (375px)
  // ---------------------------------------------------------------------------
  it("renders Mobile layout with stacked cards and responsive views (375px)", async () => {
    setViewport(375, 667);
    renderAppShell();

    // Verify Mobile Card List is present
    await waitFor(() => {
      expect(screen.getByTestId("tickets-mobile-list")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-mobile-card-101")).toBeInTheDocument();
    });

    // Verify Requester avatar initials fallback
    expect(screen.getByTestId("requester-pill")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. Mobile Ticket Detail Screen
  // ---------------------------------------------------------------------------
  it("renders Ticket Detail screen with stacked information on mobile (375px)", async () => {
    setViewport(375, 667);
    render(
      <RequesterContext.Provider
        value={{
          currentRequester: mockRequester,
          requesters: [mockRequester],
          isLoading: false,
          error: null,
          selectRequester: vi.fn(),
          changeRequester: vi.fn(),
          reloadRequesters: vi.fn(),
        }}
      >
        <TicketDetailScreen ticketIdOrNumber="TIC-20260901-0001" onBack={vi.fn()} />
      </RequesterContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-info-grid")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-content-card")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-attachments-card")).toBeInTheDocument();
    });
  });
});
