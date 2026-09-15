import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginScreen } from "../../src/components/LoginScreen.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";

const mockAuthContext: AuthContextType = {
  user: null,
  token: null,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  refreshUser: vi.fn(),
};

function renderLoginScreen(customContext?: Partial<AuthContextType>) {
  return render(
    <AuthContext.Provider value={{ ...mockAuthContext, ...customContext }}>
      <LoginScreen />
    </AuthContext.Provider>
  );
}

describe("Lab 3 — LoginScreen Component (UI-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the TokTickIT brand, title, inputs, and submit button", () => {
    renderLoginScreen();

    expect(screen.getByText("TokTickIT")).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("displays validation error when submitting with empty fields", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/please enter both email address and password/i)
    ).toBeInTheDocument();
  });

  it("toggles password visibility when clicking Show/Hide button", async () => {
    const user = userEvent.setup();
    renderLoginScreen();

    const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /show password/i });
    await user.click(toggleBtn);
    expect(passwordInput.type).toBe("text");

    await user.click(toggleBtn);
    expect(passwordInput.type).toBe("password");
  });

  it("calls login function and shows busy spinner while submitting", async () => {
    let resolveLogin: (val: any) => void = () => {};
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    const mockLogin = vi.fn().mockReturnValue(loginPromise);
    const user = userEvent.setup();

    renderLoginScreen({ login: mockLogin });

    await user.type(screen.getByLabelText(/email address/i), "alex.rivera@toktick.it");
    await user.type(screen.getByLabelText(/^password$/i), "Password123!");

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    await user.click(submitBtn);

    expect(mockLogin).toHaveBeenCalledWith("alex.rivera@toktick.it", "Password123!");
    expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();

    await waitFor(async () => {
      resolveLogin({ user: { id: 1, email: "alex.rivera@toktick.it" } });
    });
  });

  it("displays error banner when login API rejects", async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error("Invalid email address or password. Please try again."));
    const user = userEvent.setup();

    renderLoginScreen({ login: mockLogin });

    await user.type(screen.getByLabelText(/email address/i), "wrong@toktick.it");
    await user.type(screen.getByLabelText(/^password$/i), "BadPass!");

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email address or password/i)
    ).toBeInTheDocument();
  });
});
