import React, { useState, useEffect, useMemo } from "react";
import type { AdminUser, Role } from "../types";
import {
  fetchAdminUsersApi,
  createAdminUserApi,
  updateAdminUserApi,
  resetAdminUserPasswordApi,
} from "../api";
import { useAuth } from "../context/AuthContext";

export function UserManagementScreen() {
  const { user: currentAdmin } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Create User modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createRole, setCreateRole] = useState<Role>("REQUESTER");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit User modal state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editRole, setEditRole] = useState<Role>("REQUESTER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Reset Password modal state
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminUsersApi({
        search: searchTerm || undefined,
        role: roleFilter,
        isActive: statusFilter,
      });
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [searchTerm, roleFilter, statusFilter]);

  // Total active admins count
  const activeAdminCount = useMemo(() => {
    return users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
  }, [users]);

  // Handle open Edit Modal
  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setEditName(u.name || u.fullName || "");
    setEditEmail(u.email);
    setEditDepartment(u.department || "");
    setEditRole(u.role);
    setEditIsActive(u.isActive);
    setEditError(null);
  };

  // Handle open Reset Password Modal
  const openResetModal = (u: AdminUser) => {
    setResetUser(u);
    setResetPassword("");
    setResetError(null);
  };

  // Handle Submit Create
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError("Name, Email, and Initial Password are required.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);
      await createAdminUserApi({
        name: createName.trim(),
        fullName: createName.trim(),
        email: createEmail.trim(),
        department: createDepartment.trim() || undefined,
        role: createRole,
        initialPassword: createPassword.trim(),
      });

      setShowCreateModal(false);
      setCreateName("");
      setCreateEmail("");
      setCreateDepartment("");
      setCreatePassword("");
      setCreateRole("REQUESTER");
      setSuccessMessage("User account provisioned successfully.");
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Submit Edit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editingUser.id === currentAdmin?.id && !editIsActive) {
      setEditError("Safety policy forbids deactivating your own account.");
      return;
    }
    if (editingUser.id === currentAdmin?.id && editRole !== "ADMINISTRATOR") {
      setEditError("Safety policy forbids demoting your own account from Administrator.");
      return;
    }
    if (
      editingUser.role === "ADMINISTRATOR" &&
      editingUser.isActive &&
      (!editIsActive || editRole !== "ADMINISTRATOR") &&
      activeAdminCount <= 1
    ) {
      setEditError("Safety policy prevents deactivating or demoting the last active Administrator.");
      return;
    }

    try {
      setEditLoading(true);
      setEditError(null);
      await updateAdminUserApi(editingUser.id, {
        name: editName.trim(),
        fullName: editName.trim(),
        email: editEmail.trim(),
        department: editDepartment.trim() || undefined,
        role: editRole,
        isActive: editIsActive,
      });

      setEditingUser(null);
      setSuccessMessage("User account updated successfully.");
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user.");
    } finally {
      setEditLoading(false);
    }
  };

  // Handle Submit Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (!resetPassword.trim()) {
      setResetError("Please enter a new initial password.");
      return;
    }

    try {
      setResetLoading(true);
      setResetError(null);
      await resetAdminUserPasswordApi(resetUser.id, resetPassword.trim());

      setResetUser(null);
      setResetPassword("");
      setSuccessMessage(`Initial password for ${resetUser.name} reset successfully.`);
      await loadUsers();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset initial password.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="container-fluid px-0" data-testid="admin-user-management-screen">
      {/* Header & Action Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold mb-1 text-dark">
            User Management Console
          </h4>
          <p className="text-muted small mb-0">
            Provision user accounts, configure roles and access status, and enforce safety safeguards.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-zen d-flex align-items-center gap-2 shadow-sm"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError(null);
          }}
          data-testid="add-user-btn"
        >
          <span className="fw-bold">+</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div
          className="alert alert-success alert-dismissible fade show d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          style={{ backgroundColor: "var(--zen-green-50, #f0fdf4)", borderColor: "var(--zen-green-300, #86efac)", color: "var(--zen-green-800, #166534)" }}
          data-testid="admin-success-alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold">{successMessage}</span>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessMessage(null)}
            aria-label="Close"
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="card zen-card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-md-5">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="user-search-input"
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearchTerm("")}
                    aria-label="Clear search"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Role Filter */}
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="user-role-filter"
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-md-3">
              <select
                className="form-select form-select-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                data-testid="user-status-filter"
              >
                <option value="all">All Statuses</option>
                <option value="true">Active Only</option>
                <option value="false">Suspended Only</option>
              </select>
            </div>

            {/* Refresh */}
            <div className="col-12 col-md-1 text-end">
              <button
                type="button"
                className="btn btn-light btn-sm border w-100 text-muted"
                onClick={loadUsers}
                title="Refresh user list"
                data-testid="refresh-users-btn"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card zen-card border-0 shadow-sm overflow-hidden">
        {/* Desktop Table View (>= 768px) */}
        <div className="table-responsive d-none d-md-block">
          <table className="table table-hover align-middle mb-0" style={{ width: "100%" }} data-testid="admin-users-table">
            <thead className="table-light small text-uppercase text-muted" style={{ backgroundColor: "#fafcfb" }}>
              <tr>
                <th scope="col" className="ps-4">User</th>
                <th scope="col">Department</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col" className="d-none d-lg-table-cell">PW Status</th>
                <th scope="col" className="text-end pe-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2 text-success" role="status" />
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-danger">
                    <span>{error}</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted" data-testid="no-users-found">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentAdmin?.id;

                  const roleBadgeClass =
                    u.role === "ADMINISTRATOR"
                      ? "badge-role-admin"
                      : u.role === "IT_STAFF"
                      ? "badge-role-staff"
                      : "badge-role-requester";

                  return (
                    <tr key={u.id} data-testid={`user-row-${u.id}`}>
                      {/* Name & Email */}
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="rounded-circle text-white d-flex align-items-center justify-content-center fw-semibold"
                            style={{
                              width: "34px",
                              height: "34px",
                              fontSize: "0.85rem",
                              backgroundColor: "var(--color-primary, #15803d)",
                            }}
                          >
                            {(u.name || u.fullName || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="fw-semibold text-dark d-flex align-items-center gap-1" data-testid={`user-name-${u.id}`}>
                              {u.name || u.fullName}
                              {isSelf && (
                                <span className="badge bg-secondary-subtle text-secondary small py-0 px-1">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-muted small" data-testid={`user-email-${u.id}`}>
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td>
                        <span className="text-secondary small">
                          {u.department || "—"}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td>
                        <span className={`badge ${roleBadgeClass}`} data-testid={`user-role-badge-${u.id}`}>
                          {u.role === "ADMINISTRATOR"
                            ? "Administrator"
                            : u.role === "IT_STAFF"
                            ? "IT Staff"
                            : "Requester"}
                        </span>
                      </td>

                      {/* Active Status Badge */}
                      <td>
                        {u.isActive ? (
                          <span
                            className="badge badge-status-open d-inline-flex align-items-center gap-1"
                            data-testid={`user-status-active-${u.id}`}
                          >
                            <span className="rounded-circle bg-success" style={{ width: 6, height: 6 }} />
                            Active
                          </span>
                        ) : (
                          <span
                            className="badge badge-priority-urgent d-inline-flex align-items-center gap-1"
                            data-testid={`user-status-suspended-${u.id}`}
                          >
                            <span className="rounded-circle bg-danger" style={{ width: 6, height: 6 }} />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Password Change Flag */}
                      <td>
                        {u.mustChangePassword ? (
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
                            Pending Change
                          </span>
                        ) : (
                          <span className="text-muted small">Standard</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-end pe-4">
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => openEditModal(u)}
                            data-testid={`edit-user-btn-${u.id}`}
                            title="Edit User Details & Status"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => openResetModal(u)}
                            data-testid={`reset-password-btn-${u.id}`}
                            title="Reset Initial Password"
                          >
                            Reset PW
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile User Card List View (< 768px) */}
        <div className="d-flex flex-column gap-3 d-md-none p-3" data-testid="admin-users-mobile-list">
          {users.map((u) => {
            const isSelf = u.id === currentAdmin?.id;
            const roleBadgeClass =
              u.role === "ADMINISTRATOR"
                ? "badge-role-admin"
                : u.role === "IT_STAFF"
                ? "badge-role-staff"
                : "badge-role-requester";

            return (
              <div
                key={u.id}
                className="card p-3 border rounded-3 bg-white shadow-sm zen-user-card"
                data-testid={`mobile-user-card-${u.id}`}
                style={{ borderLeft: "4px solid var(--color-zen-primary, #0f5132)" }}
              >
                {/* User Header: Avatar, Name, Email, You badge */}
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div
                    className="rounded-circle text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                    style={{
                      width: "38px",
                      height: "38px",
                      fontSize: "0.9rem",
                      backgroundColor: "var(--color-primary, #15803d)",
                    }}
                  >
                    {(u.name || u.fullName || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="text-truncate">
                    <div className="fw-bold text-dark d-flex align-items-center gap-1">
                      <span>{u.name || u.fullName}</span>
                      {isSelf && (
                        <span className="badge bg-secondary-subtle text-secondary small py-0 px-1">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-muted small text-truncate">{u.email}</div>
                  </div>
                </div>

                {/* Badges Row: Role, Status, Password Flag, Department */}
                <div className="d-flex flex-wrap gap-2 align-items-center my-2 pt-2 border-top">
                  <span className={`badge ${roleBadgeClass}`}>
                    {u.role === "ADMINISTRATOR"
                      ? "Administrator"
                      : u.role === "IT_STAFF"
                      ? "IT Staff"
                      : "Requester"}
                  </span>

                  {u.isActive ? (
                    <span className="badge badge-status-open d-inline-flex align-items-center gap-1">
                      <span className="rounded-circle bg-success" style={{ width: 6, height: 6 }} />
                      Active
                    </span>
                  ) : (
                    <span className="badge badge-priority-urgent d-inline-flex align-items-center gap-1">
                      <span className="rounded-circle bg-danger" style={{ width: 6, height: 6 }} />
                      Suspended
                    </span>
                  )}

                  {u.mustChangePassword && (
                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle small">
                      PW Change Required
                    </span>
                  )}

                  {u.department && (
                    <span className="badge bg-light text-secondary border small">
                      {u.department}
                    </span>
                  )}
                </div>

                {/* Action Buttons Footer */}
                <div className="d-flex justify-content-end gap-2 pt-2 border-top mt-1">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => openEditModal(u)}
                    data-testid={`mobile-edit-user-btn-${u.id}`}
                  >
                    Edit User
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={() => openResetModal(u)}
                    data-testid={`mobile-reset-password-btn-${u.id}`}
                  >
                    Reset Password
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-3 text-muted small px-2">
        Safety policy in effect: Self-deactivation and deactivating the last remaining active Administrator are strictly restricted.
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="create-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">Provision New User Account</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCreateModal(false)}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  {createError && (
                    <div className="alert alert-danger py-2 small mb-3" data-testid="create-user-error">
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Jane Doe"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                      data-testid="create-user-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. jdoe@toktick.it"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                      data-testid="create-user-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Sales, Marketing, IT"
                      value={createDepartment}
                      onChange={(e) => setCreateDepartment(e.target.value)}
                      data-testid="create-user-dept"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as Role)}
                      data-testid="create-user-role"
                    >
                      <option value="REQUESTER">Requester (Standard Employee)</option>
                      <option value="IT_STAFF">IT Staff (Operational Support)</option>
                      <option value="ADMINISTRATOR">Administrator (System Governance)</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Initial Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      data-testid="create-user-password"
                    />
                    <div className="form-text small">
                      User will be required to change this password upon first login.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen"
                    disabled={createLoading}
                    data-testid="submit-create-user-btn"
                  >
                    {createLoading ? "Creating..." : "Provision Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="edit-user-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">Edit User Account</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingUser(null)}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  {editError && (
                    <div className="alert alert-danger py-2 small mb-3" data-testid="edit-user-error">
                      {editError}
                    </div>
                  )}

                  {/* Self or Last-Admin Warning */}
                  {editingUser.id === currentAdmin?.id && (
                    <div className="alert alert-warning py-2 small mb-3">
                      <strong>Safety notice:</strong> You are editing your own account. Self-deactivation and demotion away from Administrator are restricted.
                    </div>
                  )}
                  {editingUser.role === "ADMINISTRATOR" && editingUser.isActive && activeAdminCount <= 1 && (
                    <div className="alert alert-warning py-2 small mb-3">
                      <strong>Last Admin Warning:</strong> This is the sole remaining active Administrator in the system.
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      data-testid="edit-user-name"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Email Address *</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      required
                      data-testid="edit-user-email"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editDepartment}
                      onChange={(e) => setEditDepartment(e.target.value)}
                      data-testid="edit-user-dept"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Role *</label>
                    <select
                      className="form-select"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value as Role)}
                      disabled={editingUser.id === currentAdmin?.id}
                      data-testid="edit-user-role"
                    >
                      <option value="REQUESTER">Requester (Standard Employee)</option>
                      <option value="IT_STAFF">IT Staff (Operational Support)</option>
                      <option value="ADMINISTRATOR">Administrator (System Governance)</option>
                    </select>
                    {editingUser.id === currentAdmin?.id && (
                      <div className="form-text small text-muted">
                        Self-demotion is prevented by safety policy.
                      </div>
                    )}
                  </div>

                  {/* Active Toggle */}
                  <div className="mb-3 p-3 bg-light rounded border">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="userActiveSwitch"
                        checked={editIsActive}
                        disabled={editingUser.id === currentAdmin?.id || (editingUser.role === "ADMINISTRATOR" && editingUser.isActive && activeAdminCount <= 1)}
                        onChange={(e) => setEditIsActive(e.target.checked)}
                        data-testid="edit-user-active-switch"
                      />
                      <label className="form-check-label fw-semibold" htmlFor="userActiveSwitch">
                        {editIsActive ? "Active Account" : "Suspended / Inactive"}
                      </label>
                    </div>
                    <div className="form-text small mt-1">
                      Suspended accounts cannot log in. To preserve historical ticket audit integrity, user accounts are deactivated instead of deleted.
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen"
                    disabled={editLoading}
                    data-testid="submit-edit-user-btn"
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          data-testid="reset-password-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0" style={{ borderRadius: "12px" }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-dark">Reset Initial Password</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResetUser(null)}
                  aria-label="Close"
                />
              </div>
              <form onSubmit={handleResetPassword}>
                <div className="modal-body">
                  {resetError && (
                    <div className="alert alert-danger py-2 small mb-3" data-testid="reset-password-error">
                      {resetError}
                    </div>
                  )}

                  <p className="small text-muted mb-3">
                    Assign a new initial password for <strong>{resetUser.name}</strong> (<code>{resetUser.email}</code>).
                    The user will be required to change this password upon their next login.
                  </p>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">New Initial Password *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      required
                      data-testid="reset-password-input"
                    />
                  </div>
                </div>

                <div className="modal-footer border-top">
                  <button
                    type="button"
                    className="btn btn-light border"
                    onClick={() => setResetUser(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen"
                    disabled={resetLoading}
                    data-testid="submit-reset-password-btn"
                  >
                    {resetLoading ? "Resetting..." : "Reset & Force Change"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagementScreen;
