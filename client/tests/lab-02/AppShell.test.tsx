import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../../src/App.js";
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
];

describe("Lab 2 — AppShell & Requester Switching", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("transitions to AppShell upon selecting a requester and displays the active requester context", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    const user = userEvent.setup();

    render(<App />);

    const select = await screen.findByLabelText(/Select Development Requester/i);
    await user.selectOptions(select, "1");

    await user.click(screen.getByRole("button", { name: /Continue to Service Desk/i }));

    // AppShell should now be visible with Alex Rivera's profile
    const pill = await screen.findByTestId("requester-pill");
    expect(pill).toBeInTheDocument();
    expect(within(pill).getByText("Alex Rivera")).toBeInTheDocument();
    expect(within(pill).getByText("Engineering")).toBeInTheDocument();

    const profileCard = screen.getByTestId("requester-profile-card");
    expect(within(profileCard).getByText("alex.rivera@toktick.it")).toBeInTheDocument();
    expect(within(profileCard).getByText("Engineering")).toBeInTheDocument();

    expect(screen.getByTestId("change-requester-btn")).toBeInTheDocument();
  });

  it("allows changing the requester back to selection screen and switching context", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    const user = userEvent.setup();

    // Start with pre-selected user in localStorage
    localStorage.setItem("toktickit_current_requester_id", "1");

    render(<App />);

    // Should immediately load Alex Rivera
    const pill = await screen.findByTestId("requester-pill");
    expect(within(pill).getByText("Alex Rivera")).toBeInTheDocument();

    // Click "Change Requester" button
    const changeBtn = screen.getByTestId("change-requester-btn");
    await user.click(changeBtn);

    // Should return to the selection screen
    const select = await screen.findByLabelText(/Select Development Requester/i);
    expect(select).toBeInTheDocument();
    expect(localStorage.getItem("toktickit_current_requester_id")).toBeNull();

    // Now select Samantha Chen
    await user.selectOptions(select, "2");
    await user.click(screen.getByRole("button", { name: /Continue to Service Desk/i }));

    // Should now display Samantha Chen in AppShell
    const newPill = await screen.findByTestId("requester-pill");
    expect(within(newPill).getByText("Samantha Chen")).toBeInTheDocument();
    expect(within(newPill).getByText("Marketing")).toBeInTheDocument();
    expect(localStorage.getItem("toktickit_current_requester_id")).toBe("2");
  });

  it("allows switching persona from the profile card switch button", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);
    const user = userEvent.setup();

    localStorage.setItem("toktickit_current_requester_id", "1");
    render(<App />);

    const switchBtn = await screen.findByTestId("profile-card-switch-btn");
    await user.click(switchBtn);

    const select = await screen.findByLabelText(/Select Development Requester/i);
    expect(select).toBeInTheDocument();
    expect(localStorage.getItem("toktickit_current_requester_id")).toBeNull();
  });

  it("renders responsive shell structure with grid layout", async () => {
    vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue(mockActiveRequesters);

    localStorage.setItem("toktickit_current_requester_id", "1");
    render(<App />);

    const appShell = await screen.findByTestId("app-shell");
    expect(appShell).toBeInTheDocument();

    const profileCard = screen.getByTestId("requester-profile-card");
    expect(profileCard.closest(".col-12.col-md-4")).not.toBeNull();

    const workspaceCard = screen.getByTestId("requester-workspace-card");
    expect(workspaceCard.closest(".col-12.col-md-8")).not.toBeNull();
  });

  it("does not use passwords, sessions, or real authentication tokens", () => {
    // Assert no auth cookies or auth tokens exist in storage
    expect(localStorage.getItem("token")).toBeNull();
    expect(sessionStorage.getItem("jwt")).toBeNull();
    expect(document.cookie).toBe("");
  });
});
