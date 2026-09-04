import React, { useState } from "react";
import { checkSystem, Category } from "../api.js";

type UiState = "idle" | "loading" | "success" | "error";

export function SystemHealth() {
  const [state, setState] = useState<UiState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    setErrorMessage("");

    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to connect to TokTickIT API"
      );
    }
  }

  return (
    <div className="card zen-card p-3 mt-4 border-dashed" data-testid="system-health-panel">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h6 className="fw-bold mb-0">System Health & API Connectivity</h6>
          <small className="text-muted">Verify backend status and category seed data</small>
        </div>
        <button
          className="btn btn-outline-success btn-sm"
          onClick={handleCheck}
          disabled={state === "loading"}
        >
          {state === "loading" ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Loading...
            </>
          ) : (
            "Check System"
          )}
        </button>
      </div>

      {state === "loading" && <p className="mt-2 mb-0 text-muted small">Checking system health...</p>}
      {state === "success" && (
        <div className="mt-3 pt-3 border-top">
          <p className="mb-2 text-success fw-semibold small">System Status: Online</p>
          {categories.length > 0 && (
            <div>
              <p className="mb-2 fw-bold small text-muted">Supported Request Categories</p>
              <ol className="list-group list-group-numbered list-group-flush small">
                {categories.map((category) => (
                  <li key={category.id} className="list-group-item px-0 py-1 bg-transparent">
                    {category.name}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
      {state === "error" && (
        <div className="mt-3 pt-3 border-top text-danger small">
          <p className="mb-1 fw-semibold">System Status: Offline</p>
          <p className="mb-0">{errorMessage || "Unable to connect to TokTickIT API"}</p>
        </div>
      )}
    </div>
  );
}

export default SystemHealth;
