import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { RequesterProvider } from "../../src/context/RequesterContext.js";
import { RequesterSelectScreen } from "../../src/components/RequesterSelectScreen.js";
import * as api from "../../src/api.js";

const mockActiveRequesters = [
  {
    id: 1,
    name: "Alex Rivera",
    email: "alex.rivera@toktick.it",
    department: "Engineering",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    isActive: true,
  },
  {
    id: 2,
    name: "Samantha Chen",
    email: "samantha.chen@toktick.it",
    department: "Marketing",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha",
    isActive: true,
  },
  {
    id: 3,
    name: "Marcus Vance",
    email: "marcus.vance@toktick.it",
    department: "Finance",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    isActive: true,
  },
];

describe("Lab 2 — RequesterSelectScreen Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the TokTickIT title, Lab 2 testing notice, and active requesters dropdown", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
    expect(screen.getByText(/Lab 2 Testing Environment/i)).toBeInTheDocument();

    const select = await screen.findByLabelText(/Select Development Requester/i);
    expect(select).toBeInTheDocument();

    // Verify active users appear as options
    expect(screen.getByText(/Alex Rivera — Engineering/i)).toBeInTheDocument();
    expect(screen.getByText(/Samantha Chen — Marketing/i)).toBeInTheDocument();
    expect(screen.getByText(/Marcus Vance — Finance/i)).toBeInTheDocument();

    // Verify continue button exists
    expect(screen.getByRole("button", { name: /Continue to Service Desk/i })).toBeInTheDocument();
  });

  it("excludes inactive requesters from the dropdown", async () => {
    const mixedRequesters = [
      ...mockActiveRequesters,
      {
        id: 5,
        name: "Jordan Taylor",
        email: "jordan.taylor@toktick.it",
        department: "Operations",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
        isActive: false,
      },
    ];
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mixedRequesters as any);

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    await screen.findByLabelText(/Select Development Requester/i);

    // Inactive requester must not appear
    expect(screen.queryByText(/Jordan Taylor/i)).not.toBeInTheDocument();
  });

  it("displays loading state while active requesters are being fetched", () => {
    // Delay resolution
    vi.spyOn(api, "fetchActiveRequesters").mockImplementation(
      () => new Promise(() => {}) // never resolves
    );

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.getByText(/Loading development requesters/i)).toBeInTheDocument();
  });

  it("displays empty state when no active development requesters exist", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([]);

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    expect(await screen.findByTestId("empty-state")).toBeInTheDocument();
    expect(screen.getByText(/No active development requesters found/i)).toBeInTheDocument();
  });

  it("displays API failure error state and provides a working retry button", async () => {
    const fetchMock = vi.spyOn(api, "fetchActiveRequesters")
      .mockRejectedValueOnce(new Error("Unable to connect to TokTickIT API. Please check your connection."))
      .mockResolvedValueOnce(mockActiveRequesters);

    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText(/Connection Error/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: /Retry Connection/i });
    await user.click(retryBtn);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await screen.findByLabelText(/Select Development Requester/i)).toBeInTheDocument();
  });

  it("supports keyboard accessibility and form submission", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    const user = userEvent.setup();

    render(
      <RequesterProvider>
        <RequesterSelectScreen />
      </RequesterProvider>
    );

    const select = await screen.findByLabelText(/Select Development Requester/i);
    expect(select).toHaveAttribute("id", "requester-select");

    await user.selectOptions(select, "2");
    expect(select).toHaveValue("2");

    const submitBtn = screen.getByRole("button", { name: /Continue to Service Desk/i });
    await user.click(submitBtn);

    // After selection, localStorage should store selected ID
    expect(localStorage.getItem("toktickit_current_requester_id")).toBe("2");
  });
});
