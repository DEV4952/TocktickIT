import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/App.js";
import * as api from "../../src/api.js";
import { Requester, Category, Ticket, Attachment } from "../../src/types.js";

describe("Lab 2 — End-to-End (E2E) Complete Requester Workflow (AC-09.9)", () => {
  const mockRequesters: Requester[] = [
    {
      id: 1,
      name: "Alex Rivera",
      email: "alex.rivera@toktick.it",
      department: "Engineering",
      avatarUrl: null,
      isActive: true,
    },
    {
      id: 2,
      name: "Jordan Lee",
      email: "jordan.lee@toktick.it",
      department: "Design",
      avatarUrl: null,
      isActive: true,
    },
  ];

  const mockCategories: Category[] = [
    { id: 1, name: "Hardware" },
    { id: 2, name: "Software" },
    { id: 3, name: "Access & Accounts" },
    { id: 4, name: "Network" },
  ];

  const createdTicketNumber = "TIC-20260902-0042";
  const createdTicketData: Ticket = {
    id: 42,
    ticketNumber: createdTicketNumber,
    title: "Laptop Screen Flickering on Dock",
    description: "When plugged into Thunderbolt dock, display turns black for 2 seconds repeatedly.",
    relatedSystem: "Dell WD19TB Dock",
    status: "OPEN",
    priority: "HIGH",
    categoryId: 1,
    category: { id: 1, name: "Hardware" },
    requesterId: 1,
    requester: mockRequesters[0],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let mockAttachmentList: Attachment[] = [];

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    mockAttachmentList = [];

    // System Health & Requesters
    vi.spyOn(api, "checkSystem").mockResolvedValue({ online: true, categories: mockCategories });
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockRequesters);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);

    // Tickets Query Mock
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [
        {
          id: 42,
          ticketNumber: createdTicketNumber,
          title: "Laptop Screen Flickering on Dock",
          description: "When plugged into Thunderbolt dock, display turns black for 2 seconds repeatedly.",
          relatedSystem: "Dell WD19TB Dock",
          status: "OPEN",
          priority: "HIGH",
          categoryId: 1,
          category: { id: 1, name: "Hardware" },
          requesterId: 1,
          attachmentCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
      metrics: {
        total: 1,
        open: 1,
        inProgress: 0,
        resolved: 0,
        closed: 0,
      },
    });

    // Ticket Detail & Attachments Mock
    vi.spyOn(api, "fetchTicketById").mockImplementation(async () => ({
      ...createdTicketData,
      attachments: mockAttachmentList,
    }));
    vi.spyOn(api, "fetchTicketAttachments").mockImplementation(async () => mockAttachmentList);
  });

  it(
    "executes the full end-to-end requester lifecycle successfully (AC-09.9)",
    async () => {
      const user = userEvent.setup({ delay: null });
      render(<App />);

    // =========================================================================
    // Step 1: Select Development Requester Persona
    // =========================================================================
    await waitFor(() => {
      expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Continue to Service Desk/i });
    await user.click(submitBtn);

    // Verify transition to AppShell
    await waitFor(() => {
      expect(screen.getByTestId("app-shell")).toBeInTheDocument();
      expect(screen.getByTestId("requester-pill-name")).toHaveTextContent("Alex Rivera");
    });

    // =========================================================================
    // Step 2: Navigate to Create Ticket Screen
    // =========================================================================
    const newTicketNavBtn = screen.getByTestId("nav-new-ticket-tab");
    await user.click(newTicketNavBtn);

    await waitFor(() => {
      expect(screen.getByTestId("create-ticket-form-card")).toBeInTheDocument();
    });

    // =========================================================================
    // Step 3: Fill Ticket Form & Submit
    // =========================================================================
    const categorySelect = screen.getByTestId("ticket-category-select");
    const priorityHighRadio = screen.getByLabelText(/High/i);
    const systemInput = screen.getByTestId("ticket-related-system-input");
    const titleInput = screen.getByTestId("ticket-title-input");
    const descInput = screen.getByTestId("ticket-description-input");

    await user.selectOptions(categorySelect, "1"); // Hardware
    await user.click(priorityHighRadio);
    await user.type(systemInput, "Dell WD19TB Dock");
    await user.type(titleInput, "Laptop Screen Flickering on Dock");
    await user.type(
      descInput,
      "When plugged into Thunderbolt dock, display turns black for 2 seconds repeatedly."
    );

    // Mock API response for creation
    vi.spyOn(api, "createTicket").mockResolvedValue(createdTicketData);

    const submitTicketBtn = screen.getByTestId("submit-ticket-btn");
    await user.click(submitTicketBtn);

    // =========================================================================
    // Step 4: Verify Success Screen with Generated Ticket Number
    // =========================================================================
    await waitFor(() => {
      expect(screen.getByTestId("ticket-success-screen")).toBeInTheDocument();
      expect(screen.getByTestId("created-ticket-number")).toHaveTextContent(createdTicketNumber);
    });

    // =========================================================================
    // Step 5: Navigate back to My Tickets Dashboard
    // =========================================================================
    const backToWorkspaceBtn = screen.getByTestId("back-to-workspace-btn");
    await user.click(backToWorkspaceBtn);

    await waitFor(() => {
      expect(screen.getByTestId("my-tickets-screen")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-row-42")).toBeInTheDocument();
    });

    // =========================================================================
    // Step 6: Open Ticket Detail View
    // =========================================================================
    const viewDetailsBtn = screen.getByTestId("view-ticket-btn-42");
    await user.click(viewDetailsBtn);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-screen")).toBeInTheDocument();
      expect(screen.getByTestId("header-ticket-number")).toHaveTextContent(createdTicketNumber);
      expect(screen.getByTestId("ticket-info-summary")).toHaveTextContent("Laptop Screen Flickering on Dock");
      expect(screen.getByTestId("empty-attachments")).toBeInTheDocument();
    });

    // =========================================================================
    // Step 7: Upload Diagnostic Attachment
    // =========================================================================
    const newAtt: Attachment = {
      id: 10,
      fileName: "dock_logs.txt",
      fileSize: 15400,
      fileType: "text/plain",
      fileUrl: "/uploads/attachments/dock_logs.txt",
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    vi.spyOn(api, "uploadTicketAttachment").mockImplementation(async () => {
      mockAttachmentList = [newAtt];
      return newAtt;
    });

    const fileInput = screen.getByTestId("attachment-file-input");
    const testFile = new File(["dock diagnostic logs"], "dock_logs.txt", { type: "text/plain" });

    await user.upload(fileInput, testFile);

    await waitFor(() => {
      expect(screen.getByTestId("attachment-name-10")).toHaveTextContent("dock_logs.txt");
      expect(screen.getByTestId("download-attachment-btn-10")).toBeInTheDocument();
    });

    // =========================================================================
    // Step 8: Download Attachment
    // =========================================================================
    const downloadSpy = vi.spyOn(api, "downloadAttachment").mockResolvedValue();
    const downloadBtn = screen.getByTestId("download-attachment-btn-10");
    await user.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledWith(10, "dock_logs.txt", 1);

    // =========================================================================
    // Step 9: Soft Remove Attachment with Reason
    // =========================================================================
    const removeBtn = screen.getByTestId("remove-attachment-btn-10");
    await user.click(removeBtn);

    // Confirm modal opens
    expect(screen.getByTestId("remove-confirm-modal")).toBeInTheDocument();

    const reasonInput = screen.getByTestId("remove-reason-input");
    await user.type(reasonInput, "Outdated diagnostic log");

    vi.spyOn(api, "removeAttachment").mockResolvedValue({
      message: "Attachment soft-removed successfully.",
      attachment: { ...newAtt, isDeleted: true },
    });

    const confirmRemoveBtn = screen.getByTestId("confirm-remove-btn");
    await user.click(confirmRemoveBtn);

    // Verify soft-removed badge appears and download button is removed
    await waitFor(() => {
      expect(screen.getByTestId("removed-badge-10")).toHaveTextContent("Removed");
      expect(screen.getByTestId("removed-meta-10")).toHaveTextContent(/Outdated diagnostic log/);
      expect(screen.queryByTestId("download-attachment-btn-10")).not.toBeInTheDocument();
    });
  }, 25000);
});
