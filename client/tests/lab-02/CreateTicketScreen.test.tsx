import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { CreateTicketScreen } from "../../src/components/CreateTicketScreen.js";
import { RequesterContext, RequesterContextType } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";
import { Requester, Category } from "../../src/types.js";

const mockActiveRequester: Requester = {
  id: 1,
  name: "Alex Rivera",
  email: "alex.rivera@toktick.it",
  department: "Engineering",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  isActive: true,
};

const mockInactiveRequester: Requester = {
  id: 5,
  name: "Jordan Taylor",
  email: "jordan.taylor@toktick.it",
  department: "Operations",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
  isActive: false,
};

const mockCategories: Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

function renderWithRequester(
  component: React.ReactNode,
  requester: Requester = mockActiveRequester
) {
  const contextValue: RequesterContextType = {
    currentRequester: requester,
    requesters: [mockActiveRequester, mockInactiveRequester],
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

describe("Lab 2 — CreateTicketScreen Component", () => {
  beforeEach(() => {
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Create Ticket form and displays the active requester context", async () => {
    renderWithRequester(<CreateTicketScreen />);

    expect(await screen.findByTestId("create-ticket-form-card")).toBeInTheDocument();
    expect(screen.getByText(/Submit New IT Ticket/i)).toBeInTheDocument();
    expect(screen.getByTestId("requester-context-bar")).toHaveTextContent("Alex Rivera");
    expect(screen.getByTestId("requester-context-bar")).toHaveTextContent("Engineering");
    expect(screen.getByTestId("ticket-title-input")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-description-input")).toBeInTheDocument();
    expect(screen.getByTestId("submit-ticket-btn")).toBeInTheDocument();
  });

  it("dynamically loads and populates category dropdown from API", async () => {
    renderWithRequester(<CreateTicketScreen />);

    const select = await screen.findByTestId("ticket-category-select");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Software" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Account and Access" })).toBeInTheDocument();
  });

  it("validates required fields on submit and displays inline errors without calling API", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    await screen.findByTestId("ticket-category-select");

    // Click submit immediately on empty form
    await user.click(screen.getByTestId("submit-ticket-btn"));

    expect(screen.getByTestId("title-error")).toHaveTextContent(/Title is required/i);
    expect(screen.getByTestId("category-error")).toHaveTextContent(/Please select an IT category/i);
    expect(screen.getByTestId("description-error")).toHaveTextContent(/Description is required/i);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("validates character length constraints for title (<5 chars) and description (<10 chars)", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    await screen.findByTestId("ticket-category-select");

    await user.type(screen.getByTestId("ticket-title-input"), "VPN"); // 3 chars
    await user.type(screen.getByTestId("ticket-description-input"), "Too short"); // 9 chars
    await user.selectOptions(screen.getByTestId("ticket-category-select"), "4");

    await user.click(screen.getByTestId("submit-ticket-btn"));

    expect(screen.getByTestId("title-error")).toHaveTextContent(/at least 5 characters/i);
    expect(screen.getByTestId("description-error")).toHaveTextContent(/at least 10 characters/i);
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("updates character counters dynamically as user types", async () => {
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    const titleInput = screen.getByTestId("ticket-title-input");
    const descInput = screen.getByTestId("ticket-description-input");

    expect(screen.getByTestId("title-char-counter")).toHaveTextContent("0/150");
    expect(screen.getByTestId("description-char-counter")).toHaveTextContent("0/2000");

    await user.type(titleInput, "VPN issue");
    await user.type(descInput, "Cannot connect to the gateway server.");

    expect(screen.getByTestId("title-char-counter")).toHaveTextContent("9/150");
    expect(screen.getByTestId("description-char-counter")).toHaveTextContent("37/2000");
  });

  it("handles attachment file addition, validation, and removal", async () => {
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    const fileInput = screen.getByTestId("ticket-attachment-input");

    // 1. Valid file
    const validFile = new File(["dummy content"], "diagnostic-log.txt", { type: "text/plain" });
    await user.upload(fileInput, validFile);

    expect(await screen.findByTestId("attachment-item-0")).toHaveTextContent("diagnostic-log.txt");

    // 2. Remove file
    await user.click(screen.getByTestId("remove-attachment-btn-0"));
    expect(screen.queryByTestId("attachment-item-0")).not.toBeInTheDocument();
  });

  it("rejects files exceeding 5MB size limit with inline alert", async () => {
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    const fileInput = screen.getByTestId("ticket-attachment-input");
    const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "huge-video.png", { type: "image/png" });

    await user.upload(fileInput, oversizedFile);

    expect(await screen.findByTestId("attachment-error")).toHaveTextContent(/exceeds the 5MB size limit/i);
    expect(screen.queryByTestId("attachment-item-0")).not.toBeInTheDocument();
  });

  it("submits valid form data and renders the success confirmation screen with generated Ticket Number", async () => {
    const mockCreatedTicket: any = {
      id: 42,
      ticketNumber: "TIC-20260901-0042",
      title: "Cannot connect to internal VPN gateway",
      description: "After updating Cisco AnyConnect, the authentication handshake times out.",
      relatedSystem: "Cisco AnyConnect",
      status: "OPEN",
      priority: "HIGH",
      categoryId: 4,
      category: { id: 4, name: "Network" },
      requesterId: 1,
      requester: mockActiveRequester,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createSpy = vi.spyOn(api, "createTicket").mockResolvedValue(mockCreatedTicket);
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    await screen.findByTestId("ticket-category-select");

    await user.type(screen.getByTestId("ticket-title-input"), "Cannot connect to internal VPN gateway");
    await user.selectOptions(screen.getByTestId("ticket-category-select"), "4");
    await user.click(screen.getByLabelText(/High/i));
    await user.type(screen.getByTestId("ticket-related-system-input"), "Cisco AnyConnect");
    await user.type(
      screen.getByTestId("ticket-description-input"),
      "After updating Cisco AnyConnect, the authentication handshake times out."
    );

    await user.click(screen.getByTestId("submit-ticket-btn"));

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cannot connect to internal VPN gateway",
        description: "After updating Cisco AnyConnect, the authentication handshake times out.",
        categoryId: 4,
        relatedSystem: "Cisco AnyConnect",
        priority: "HIGH",
      }),
      1
    );

    // Verify Success Screen renders
    expect(await screen.findByTestId("ticket-success-screen")).toBeInTheDocument();
    expect(screen.getByTestId("success-heading")).toHaveTextContent(/Ticket Created Successfully!/i);
    expect(screen.getByTestId("created-ticket-number")).toHaveTextContent("TIC-20260901-0042");
    expect(screen.getByTestId("created-ticket-title")).toHaveTextContent("Cannot connect to internal VPN gateway");
  });

  it("handles API failure (500) and preserves user-entered form data", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to connect to TokTickIT API."));
    const user = userEvent.setup();
    renderWithRequester(<CreateTicketScreen />);

    await screen.findByTestId("ticket-category-select");

    await user.type(screen.getByTestId("ticket-title-input"), "Server database connection timeout");
    await user.selectOptions(screen.getByTestId("ticket-category-select"), "4");
    await user.type(
      screen.getByTestId("ticket-description-input"),
      "PostgreSQL container is unresponsive on port 5432."
    );

    await user.click(screen.getByTestId("submit-ticket-btn"));

    expect(await screen.findByTestId("api-error-alert")).toHaveTextContent(/Unable to connect to TokTickIT API/i);

    // Form inputs must remain preserved
    expect(screen.getByTestId("ticket-title-input")).toHaveValue("Server database connection timeout");
    expect(screen.getByTestId("ticket-category-select")).toHaveValue("4");
    expect(screen.getByTestId("ticket-description-input")).toHaveValue(
      "PostgreSQL container is unresponsive on port 5432."
    );
  });

  it("disables form inputs and displays warning banner when requester is inactive", async () => {
    renderWithRequester(<CreateTicketScreen />, mockInactiveRequester);

    expect(await screen.findByTestId("inactive-requester-alert")).toBeInTheDocument();
    expect(screen.getByTestId("inactive-requester-alert")).toHaveTextContent(/Your user profile \(Jordan Taylor\) is currently suspended/i);
    expect(screen.getByTestId("ticket-title-input")).toBeDisabled();
    expect(screen.getByTestId("ticket-description-input")).toBeDisabled();
    expect(screen.getByTestId("submit-ticket-btn")).toBeDisabled();
  });
});
