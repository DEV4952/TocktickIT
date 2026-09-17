import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { UserManagementScreen } from "../../src/components/UserManagementScreen";
import { AppShell } from "../../src/components/AppShell";
import * as api from "../../src/api";
import * as AuthContextModule from "../../src/context/AuthContext";
import * as RequesterContextModule from "../../src/context/RequesterContext";
import type { AdminUser, Role } from "../../src/types";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchAdminUsersApi: vi.fn(),
    createAdminUserApi: vi.fn(),
    updateAdminUserApi: vi.fn(),
    resetAdminUserPasswordApi: vi.fn(),
  };
});

describe("Lab 3 — Administrator User Management Screen (Issue #8 / #45)", () => {
  const mockAdminUser = {
    id: 1,
    name: "Admin User",
    fullName: "Admin User",
    email: "admin@example.com",
    department: "IT",
    role: "ADMINISTRATOR" as Role,
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const mockUsersList: AdminUser[] = [
    {
      id: 1,
      name: "Admin User",
      fullName: "Admin User",
      email: "admin@example.com",
      department: "IT",
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: 2,
      name: "Staff User",
      fullName: "Staff User",
      email: "staff@example.com",
      department: "Support",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      createdAt: "2026-09-02T00:00:00.000Z",
    },
    {
      id: 3,
      name: "Normal Requester",
      fullName: "Normal Requester",
      email: "requester@example.com",
      department: "Sales",
      role: "REQUESTER",
      isActive: false,
      mustChangePassword: true,
      createdAt: "2026-09-03T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
      user: mockAdminUser,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      refreshUser: vi.fn(),
      token: "test-token",
      error: null,
    });
    vi.spyOn(RequesterContextModule, "useRequester").mockReturnValue({
      currentRequester: mockAdminUser,
      requesters: [mockAdminUser],
      selectRequester: vi.fn(),
      changeRequester: vi.fn(),
      isLoading: false,
      error: null,
      reloadRequesters: vi.fn(),
    });
    vi.mocked(api.fetchAdminUsersApi).mockResolvedValue(mockUsersList);
  });

  describe("User Listing and Display (FR-12 / AC-11)", () => {
    it("renders user table with name, email, role badge, status badge and action buttons", async () => {
      render(<UserManagementScreen />);

      await waitFor(() => {
        expect(screen.getByTestId("admin-users-table")).toBeInTheDocument();
      });

      // Assert rows
      expect(screen.getByTestId("user-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-2")).toBeInTheDocument();
      expect(screen.getByTestId("user-row-3")).toBeInTheDocument();

      // Assert content
      expect(screen.getByTestId("user-name-1")).toHaveTextContent("Admin User");
      expect(screen.getByTestId("user-email-1")).toHaveTextContent("admin@example.com");
      expect(screen.getByTestId("user-role-badge-1")).toHaveTextContent("Administrator");
      expect(screen.getByTestId("user-status-active-1")).toHaveTextContent("Active");

      expect(screen.getByTestId("user-status-suspended-3")).toHaveTextContent("Suspended");
    });

    it("triggers search query when typing in search input", async () => {
      render(<UserManagementScreen />);

      const searchInput = await screen.findByTestId("user-search-input");
      fireEvent.change(searchInput, { target: { value: "Staff" } });

      await waitFor(() => {
        expect(api.fetchAdminUsersApi).toHaveBeenCalledWith(
          expect.objectContaining({ search: "Staff" })
        );
      });
    });

    it("triggers role filter query when selecting role dropdown", async () => {
      render(<UserManagementScreen />);

      const roleFilter = await screen.findByTestId("user-role-filter");
      fireEvent.change(roleFilter, { target: { value: "IT_STAFF" } });

      await waitFor(() => {
        expect(api.fetchAdminUsersApi).toHaveBeenCalledWith(
          expect.objectContaining({ role: "IT_STAFF" })
        );
      });
    });
  });

  describe("User Provisioning (FR-13 / AC-12)", () => {
    it("opens Add User modal and submits new user account", async () => {
      vi.mocked(api.createAdminUserApi).mockResolvedValue({
        user: {
          id: 4,
          name: "New Recruit",
          email: "recruit@example.com",
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: true,
          createdAt: "2026-09-04T00:00:00.000Z",
        },
        message: "Created",
      });

      render(<UserManagementScreen />);

      const addBtn = await screen.findByTestId("add-user-btn");
      fireEvent.click(addBtn);

      expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();

      fireEvent.change(screen.getByTestId("create-user-name"), { target: { value: "New Recruit" } });
      fireEvent.change(screen.getByTestId("create-user-email"), { target: { value: "recruit@example.com" } });
      fireEvent.change(screen.getByTestId("create-user-dept"), { target: { value: "Engineering" } });
      fireEvent.change(screen.getByTestId("create-user-role"), { target: { value: "IT_STAFF" } });
      fireEvent.change(screen.getByTestId("create-user-password"), { target: { value: "Secret123!" } });

      fireEvent.click(screen.getByTestId("submit-create-user-btn"));

      await waitFor(() => {
        expect(api.createAdminUserApi).toHaveBeenCalledWith({
          name: "New Recruit",
          fullName: "New Recruit",
          email: "recruit@example.com",
          department: "Engineering",
          role: "IT_STAFF",
          initialPassword: "Secret123!",
        });
      });

      await waitFor(() => {
        expect(screen.queryByTestId("create-user-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("Safety Rules & Account Editing (FR-14 / AC-13 / AC-14 / BR-12, BR-13)", () => {
    it("prevents Admin from self-deactivating in UI", async () => {
      render(<UserManagementScreen />);

      const editBtn = await screen.findByTestId("edit-user-btn-1");
      fireEvent.click(editBtn);

      expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

      // For user 1 (the current admin), the switch should be disabled or protected
      const activeSwitch = screen.getByTestId("edit-user-active-switch");
      expect(activeSwitch).toBeDisabled();
    });

    it("prevents Admin from self-demoting role in UI", async () => {
      render(<UserManagementScreen />);

      const editBtn = await screen.findByTestId("edit-user-btn-1");
      fireEvent.click(editBtn);

      const roleSelect = screen.getByTestId("edit-user-role");
      expect(roleSelect).toBeDisabled();
    });

    it("allows editing details and active toggle for another user", async () => {
      vi.mocked(api.updateAdminUserApi).mockResolvedValue({
        user: { ...mockUsersList[1], name: "Staff Member Updated" },
      });

      render(<UserManagementScreen />);

      const editBtn = await screen.findByTestId("edit-user-btn-2");
      fireEvent.click(editBtn);

      expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

      const nameInput = screen.getByTestId("edit-user-name");
      fireEvent.change(nameInput, { target: { value: "Staff Member Updated" } });

      fireEvent.click(screen.getByTestId("submit-edit-user-btn"));

      await waitFor(() => {
        expect(api.updateAdminUserApi).toHaveBeenCalledWith(
          2,
          expect.objectContaining({
            name: "Staff Member Updated",
          })
        );
      });
    });
  });

  describe("Password Reset (FR-15)", () => {
    it("opens reset password modal and resets initial password", async () => {
      vi.mocked(api.resetAdminUserPasswordApi).mockResolvedValue({
        message: "Initial password reset successfully",
      });

      render(<UserManagementScreen />);

      const resetBtn = await screen.findByTestId("reset-password-btn-3");
      fireEvent.click(resetBtn);

      expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();

      fireEvent.change(screen.getByTestId("reset-password-input"), {
        target: { value: "NewResetPW123!" },
      });

      fireEvent.click(screen.getByTestId("submit-reset-password-btn"));

      await waitFor(() => {
        expect(api.resetAdminUserPasswordApi).toHaveBeenCalledWith(3, "NewResetPW123!");
      });

      await waitFor(() => {
        expect(screen.queryByTestId("reset-password-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("AppShell Administrator Navigation", () => {
    it("renders User Management nav button for Administrator and switches to it", async () => {
      render(<AppShell />);

      const adminUsersTab = await screen.findByTestId("nav-admin-users-tab");
      expect(adminUsersTab).toBeInTheDocument();

      fireEvent.click(adminUsersTab);

      await waitFor(() => {
        expect(screen.getByTestId("admin-user-management-screen")).toBeInTheDocument();
      });
    });

    it("hides User Management nav button for non-administrators", async () => {
      vi.spyOn(AuthContextModule, "useAuth").mockReturnValue({
        user: { ...mockAdminUser, role: "IT_STAFF" },
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        changePassword: vi.fn(),
        refreshUser: vi.fn(),
        token: "test-token",
        error: null,
      });

      await act(async () => {
        render(<AppShell />);
      });

      expect(screen.queryByTestId("nav-admin-users-tab")).not.toBeInTheDocument();
    });
  });
});
