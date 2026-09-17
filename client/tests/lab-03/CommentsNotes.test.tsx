import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";
import { Requester, Ticket, TicketComment, InternalNote } from "../../src/types.js";

describe("Lab 3 — Ticket Communications: Comments & Notes UI (Issue #7)", () => {
  const mockRequester: Requester = {
    id: 1,
    name: "Alex Rivera",
    email: "alex.rivera@toktick.it",
    department: "Engineering",
    avatarUrl: null,
    isActive: true,
  };

  const mockStaffUser = {
    id: 10,
    name: "Michael Brown",
    email: "michael.brown@toktick.it",
    department: "IT Support",
    role: "IT_STAFF" as const,
    isActive: true,
    mustChangePassword: false,
  };

  const mockTicket: Ticket = {
    id: 101,
    ticketNumber: "TIC-20260901-0001",
    title: "VPN handshake failure",
    description: "Handshake timed out after AnyConnect upgrade.",
    relatedSystem: "Cisco AnyConnect",
    status: "OPEN",
    priority: "HIGH",
    itPriority: "HIGH",
    problemAppearsResolved: false,
    categoryId: 4,
    category: { id: 4, name: "Network" },
    requesterId: 1,
    requester: mockRequester,
    attachments: [],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };

  const mockComments: TicketComment[] = [
    {
      id: 1,
      ticketId: 101,
      body: "Initial diagnostic information uploaded.",
      createdAt: "2026-09-01T10:15:00.000Z",
      author: {
        id: 1,
        name: "Alex Rivera",
        role: "REQUESTER",
      },
    },
    {
      id: 2,
      ticketId: 101,
      body: "We are investigating gateway routes.",
      createdAt: "2026-09-01T10:30:00.000Z",
      author: {
        id: 10,
        name: "Michael Brown",
        role: "IT_STAFF",
      },
    },
  ];

  const mockNotes: InternalNote[] = [
    {
      id: 1,
      ticketId: 101,
      body: "Gateway firewall rule needs inspection by network admin.",
      createdAt: "2026-09-01T10:20:00.000Z",
      author: {
        id: 10,
        name: "Michael Brown",
        role: "IT_STAFF",
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockTicket);
    vi.spyOn(api, "fetchTicketAttachments").mockResolvedValue([]);
    vi.spyOn(api, "fetchTicketComments").mockResolvedValue(mockComments);
    vi.spyOn(api, "fetchTicketInternalNotes").mockResolvedValue(mockNotes);
    vi.spyOn(api, "fetchAssignableStaffApi").mockResolvedValue([mockStaffUser]);
  });

  const renderScreen = (user: any = null, requester: any = mockRequester) => {
    return render(
      <AuthContext.Provider
        value={{
          user,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        <RequesterContext.Provider
          value={{
            currentRequester: requester,
            requesters: [requester],
            isLoading: false,
            error: null,
            selectRequester: vi.fn(),
            changeRequester: vi.fn(),
            reloadRequesters: vi.fn(),
          }}
        >
          <TicketDetailScreen ticketIdOrNumber="TIC-20260901-0001" onBack={vi.fn()} />
        </RequesterContext.Provider>
      </AuthContext.Provider>
    );
  };

  it("renders Public Comments and strictly hides Internal Notes for Requester (AC-04 / UI-05)", async () => {
    renderScreen(null, mockRequester);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
    });

    // Public comments header and list should be present
    expect(screen.getByTestId("public-comments-header")).toBeInTheDocument();
    expect(screen.getByTestId("comments-list")).toBeInTheDocument();
    expect(screen.getByTestId("comment-item-1")).toHaveTextContent("Initial diagnostic information uploaded.");
    expect(screen.getByTestId("comment-author-1")).toHaveTextContent("Alex Rivera");

    // Internal Notes tab and panel MUST NOT be rendered
    expect(screen.queryByTestId("tab-internal-notes")).not.toBeInTheDocument();
    expect(screen.queryByTestId("notes-panel")).not.toBeInTheDocument();
  });

  it("renders distinct tabs for Public Comments and Internal Notes for IT Staff (UI-05)", async () => {
    renderScreen(mockStaffUser, null);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
    });

    // Both tabs must be visible
    expect(screen.getByTestId("tab-public-comments")).toBeInTheDocument();
    expect(screen.getByTestId("tab-internal-notes")).toBeInTheDocument();

    // Default tab is Public Comments
    expect(screen.getByTestId("comments-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("notes-panel")).not.toBeInTheDocument();

    // Switch to Internal Notes
    fireEvent.click(screen.getByTestId("tab-internal-notes"));

    expect(screen.getByTestId("notes-panel")).toBeInTheDocument();
    expect(screen.getByTestId("note-item-1")).toHaveTextContent("Gateway firewall rule needs inspection");
    expect(screen.queryByTestId("comments-panel")).not.toBeInTheDocument();
  });

  it("allows submitting a Public Comment (AC-10)", async () => {
    const createCommentSpy = vi.spyOn(api, "createTicketComment").mockResolvedValue({
      id: 3,
      ticketId: 101,
      body: "User verified power cycle did not resolve.",
      createdAt: new Date().toISOString(),
      author: { id: 1, name: "Alex Rivera", role: "REQUESTER" },
    });

    renderScreen(null, mockRequester);

    await waitFor(() => {
      expect(screen.getByTestId("new-comment-input")).toBeInTheDocument();
    });

    const textarea = screen.getByTestId("new-comment-input");
    const postBtn = screen.getByTestId("post-comment-btn");

    await userEvent.type(textarea, "User verified power cycle did not resolve.");
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(createCommentSpy).toHaveBeenCalledWith(101, "User verified power cycle did not resolve.", 1);
    });
  });

  it("renders 'Problem Appears Resolved' button for Requester and opens modal (AC-09)", async () => {
    renderScreen(null, mockRequester);

    await waitFor(() => {
      expect(screen.getByTestId("problem-resolved-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("problem-resolved-btn"));

    expect(screen.getByTestId("resolve-confirm-modal")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-resolve-btn")).toBeInTheDocument();
  });
});
