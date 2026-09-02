import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketDetailScreen } from "../../src/components/TicketDetailScreen.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Requester, Ticket, Attachment } from "../../src/types.js";

// Mock API functions
vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchTicketById: vi.fn(),
    fetchTicketAttachments: vi.fn(),
    uploadTicketAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
    removeAttachment: vi.fn(),
  };
});

describe("Lab 2 — TicketDetailScreen Component (Issue #8)", () => {
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
    description: "After updating Cisco AnyConnect, the authentication handshake times out with error 403.\nRebooted machine twice.",
    relatedSystem: "Cisco AnyConnect",
    status: "OPEN",
    priority: "HIGH",
    categoryId: 4,
    category: { id: 4, name: "Network" },
    requesterId: 1,
    requester: mockRequester,
    attachments: [
      {
        id: 1,
        fileName: "vpn_log.txt",
        fileSize: 45000,
        fileType: "text/plain",
        fileUrl: "/uploads/attachments/vpn_log.txt",
        createdAt: "2026-09-01T10:00:00.000Z",
      },
    ],
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  };

  const mockAttachments: Attachment[] = [
    {
      id: 1,
      fileName: "vpn_log.txt",
      fileSize: 45000,
      fileType: "text/plain",
      fileUrl: "/uploads/attachments/vpn_log.txt",
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      id: 2,
      fileName: "old_screenshot.png",
      fileSize: 120000,
      fileType: "image/png",
      fileUrl: "/uploads/attachments/old_screenshot.png",
      isDeleted: true,
      deletedAt: "2026-09-01T11:00:00.000Z",
      removalReason: "Duplicate file",
      createdAt: "2026-09-01T10:05:00.000Z",
    },
  ];

  const renderWithContext = (ticketIdOrNumber: string | number = "TIC-20260901-0001", onBack = vi.fn()) => {
    return render(
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
        <TicketDetailScreen ticketIdOrNumber={ticketIdOrNumber} onBack={onBack} />
      </RequesterContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Loading & Detail Rendering (AC-08.1)
  // ---------------------------------------------------------------------------
  it("AC-08.1: renders loading state initially and then displays full read-only ticket information", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue(mockAttachments);

    renderWithContext("TIC-20260901-0001");

    // Check loading state
    expect(screen.getByTestId("detail-loading-state")).toBeInTheDocument();

    // Wait for content
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
    });

    // Check header
    expect(screen.getByTestId("header-ticket-number")).toHaveTextContent("TIC-20260901-0001");
    expect(screen.getByTestId("header-ticket-status")).toHaveTextContent("OPEN");
    expect(screen.getByTestId("header-ticket-priority")).toHaveTextContent("HIGH Priority");

    // Check Read-only Info Grid
    expect(screen.getByTestId("ticket-info-number")).toHaveTextContent("TIC-20260901-0001");
    expect(screen.getByTestId("ticket-info-requester")).toHaveTextContent("Alex Rivera (Engineering)");
    expect(screen.getByTestId("ticket-info-category")).toHaveTextContent("Network");
    expect(screen.getByTestId("ticket-info-system")).toHaveTextContent("Cisco AnyConnect");
    expect(screen.getByTestId("ticket-info-priority")).toHaveTextContent("HIGH");

    // Check Summary & Multiline Description
    expect(screen.getByTestId("ticket-info-summary")).toHaveTextContent("Cannot connect to internal VPN gateway");
    expect(screen.getByTestId("ticket-info-description")).toHaveTextContent(/After updating Cisco AnyConnect/);
  });

  // ---------------------------------------------------------------------------
  // 2. Unauthorized & Not Found Access (AC-08.2 & AC-08.9)
  // ---------------------------------------------------------------------------
  it("AC-08.2: displays unauthorized access error when requester does not own ticket", async () => {
    vi.mocked(api.fetchTicketById).mockRejectedValue(
      new Error("Ticket not found or you do not have permission to view it.")
    );

    renderWithContext("TIC-20260901-9999");

    await waitFor(() => {
      expect(screen.getByTestId("detail-unauthorized-state")).toBeInTheDocument();
    });

    expect(screen.getByText(/You do not have access to this ticket/i)).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-info-summary")).not.toBeInTheDocument();
  });

  it("AC-08.9: displays not found state when ticket does not exist", async () => {
    vi.mocked(api.fetchTicketById).mockRejectedValue(new Error("Ticket not found."));

    renderWithContext("TIC-NONEXISTENT");

    await waitFor(() => {
      expect(screen.getByTestId("detail-not-found-state")).toBeInTheDocument();
    });

    expect(screen.getByTestId("not-found-back-btn")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. Attachments Display & Empty State (AC-08.3 & AC-08.4)
  // ---------------------------------------------------------------------------
  it("AC-08.3 & AC-08.8: renders active and soft-removed attachments properly", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue(mockAttachments);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("attachments-list")).toBeInTheDocument();
    });

    // Active attachment
    expect(screen.getByTestId("attachment-name-1")).toHaveTextContent("vpn_log.txt");
    expect(screen.getByTestId("download-attachment-btn-1")).toBeInTheDocument();
    expect(screen.getByTestId("remove-attachment-btn-1")).toBeInTheDocument();

    // Removed attachment
    expect(screen.getByTestId("attachment-name-2")).toHaveTextContent("old_screenshot.png");
    expect(screen.getByTestId("removed-badge-2")).toHaveTextContent("Removed");
    expect(screen.getByTestId("removed-meta-2")).toHaveTextContent(/Duplicate file/);
    expect(screen.queryByTestId("download-attachment-btn-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("remove-attachment-btn-2")).not.toBeInTheDocument();
  });

  it("AC-08.4: renders empty state when ticket has no attachments", async () => {
    const emptyTicket = { ...mockTicket, attachments: [] };
    vi.mocked(api.fetchTicketById).mockResolvedValue(emptyTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([]);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("empty-attachments")).toBeInTheDocument();
    });

    expect(screen.getByText(/No attachments/i)).toBeInTheDocument();
    expect(screen.getByText(/No supporting files have been attached to this ticket yet/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. Upload Attachment (AC-08.5)
  // ---------------------------------------------------------------------------
  it("AC-08.5: uploads valid attachment and updates attachment list", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments)
      .mockResolvedValueOnce([mockAttachments[0]])
      .mockResolvedValueOnce([...mockAttachments]);
    vi.mocked(api.uploadTicketAttachment).mockResolvedValue({
      id: 2,
      fileName: "screenshot.png",
      fileSize: 50000,
      fileType: "image/png",
      fileUrl: "/uploads/attachments/screenshot.png",
    });

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("add-attachment-btn")).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId("attachment-file-input");
    const file = new File(["dummy content"], "screenshot.png", { type: "image/png" });

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(api.uploadTicketAttachment).toHaveBeenCalledWith(
        "TIC-20260901-0001",
        expect.any(File),
        1
      );
    });
  });

  it("AC-08.5: validates file size > 5MB and unsupported file format", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([]);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("attachment-file-input")).toBeInTheDocument();
    });

    const fileInput = screen.getByTestId("attachment-file-input");

    // Test unsupported file format (.exe)
    const invalidFile = new File(["malware"], "virus.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByTestId("upload-error-alert")).toHaveTextContent(
      /File type is not supported/i
    );

    // Test file size > 5MB
    const bigBlob = new Array(5.5 * 1024 * 1024).fill("a").join("");
    const bigFile = new File([bigBlob], "big_dump.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    expect(screen.getByTestId("upload-error-alert")).toHaveTextContent(
      /File size must not exceed 5 MB/i
    );
  });

  // ---------------------------------------------------------------------------
  // 5. Download Attachment (AC-08.6)
  // ---------------------------------------------------------------------------
  it("AC-08.6: triggers download for active attachment", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([mockAttachments[0]]);
    vi.mocked(api.downloadAttachment).mockResolvedValue();

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("download-attachment-btn-1")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("download-attachment-btn-1"));

    expect(api.downloadAttachment).toHaveBeenCalledWith(1, "vpn_log.txt", 1);
  });

  // ---------------------------------------------------------------------------
  // 6. Remove Attachment with Reason (AC-08.7)
  // ---------------------------------------------------------------------------
  it("AC-08.7: opens confirmation modal and soft-removes attachment with reason", async () => {
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue([mockAttachments[0]]);
    vi.mocked(api.removeAttachment).mockResolvedValue({
      message: "Attachment soft-removed successfully.",
      attachment: { ...mockAttachments[0], isDeleted: true },
    });

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("remove-attachment-btn-1")).toBeInTheDocument();
    });

    // Click Remove button
    await userEvent.click(screen.getByTestId("remove-attachment-btn-1"));

    // Modal appears
    expect(screen.getByTestId("remove-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to remove/i)).toBeInTheDocument();

    // Type reason
    const reasonInput = screen.getByTestId("remove-reason-input");
    await userEvent.type(reasonInput, "Outdated error log");

    // Click Confirm
    await userEvent.click(screen.getByTestId("confirm-remove-btn"));

    await waitFor(() => {
      expect(api.removeAttachment).toHaveBeenCalledWith(1, 1, "Outdated error log");
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Navigation & Back button
  // ---------------------------------------------------------------------------
  it("navigates back to My Tickets when clicking back button", async () => {
    const handleBack = vi.fn();
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchTicketAttachments).mockResolvedValue(mockAttachments);

    renderWithContext("TIC-20260901-0001", handleBack);

    await waitFor(() => {
      expect(screen.getByTestId("back-to-tickets-btn")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("back-to-tickets-btn"));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });
});
