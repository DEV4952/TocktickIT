import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePasswordScreen } from "../../src/components/ChangePasswordScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";

const mockAuthContext: AuthContextType = {
  user: {
    id: 6,
    email: "emily.davis@toktick.it",
    name: "Emily Davis",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: true,
  },
  token: "mock-token",
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  refreshUser: vi.fn(),
};

function renderChangePasswordScreen(customContext?: Partial<AuthContextType>) {
  return render(
    <AuthContext.Provider value={{ ...mockAuthContext, ...customContext }}>
      <ChangePasswordScreen />
    </AuthContext.Provider>
  );
}

describe("Lab 3 — ChangePasswordScreen Component (UI-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders change password heading, inputs, checklist, and submit button", () => {
    renderChangePasswordScreen();

    expect(screen.getByText("Change Your Password")).toBeInTheDocument();
    expect(screen.getByLabelText(/current \(temporary\) password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByText(/be at least 8 characters/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("dynamically validates password complexity rules in real-time", async () => {
    const user = userEvent.setup();
    renderChangePasswordScreen();

    const newPassInput = screen.getByLabelText(/^new password/i);

    // Initial state: criteria not met
    const lengthItem = screen.getByText(/be at least 8 characters/i);
    expect(lengthItem).toHaveTextContent("○");

    // Type valid 8+ chars with uppercase, lowercase, digit, special
    await user.type(newPassInput, "ValidPass123!");
    expect(lengthItem).toHaveTextContent("✓");
  });

  it("submits valid password change and calls changePassword API", async () => {
    const mockChangePassword = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderChangePasswordScreen({ changePassword: mockChangePassword });

    await user.type(screen.getByLabelText(/current \(temporary\) password/i), "Password123!");
    await user.type(screen.getByLabelText(/^new password/i), "NewSuperSecret#2026");
    await user.type(screen.getByLabelText(/confirm new password/i), "NewSuperSecret#2026");

    const submitBtn = screen.getByRole("button", { name: /continue/i });
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);

    expect(mockChangePassword).toHaveBeenCalledWith(
      "Password123!",
      "NewSuperSecret#2026",
      "NewSuperSecret#2026"
    );
  });
});
