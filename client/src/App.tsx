import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
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
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? (
          <>
            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Loading...
          </>
        ) : (
          "Check System"
        )}
      </button>

      {state === "loading" && <p className="mt-3 mb-0 text-muted">Loading...</p>}
      {state === "success" && (
        <div className="mt-3">
          <p className="mb-2">System Status: Online</p>
          {categories.length > 0 && (
            <>
              <p className="mb-2 fw-bold">Supported Request Categories</p>
              <ol className="list-group list-group-numbered">
                {categories.map((category) => (
                  <li key={category.id} className="list-group-item">
                    {category.name}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
      {state === "error" && (
        <div className="mt-3 text-danger">
          <p className="mb-1">System Status: Offline</p>
          <p className="mb-0">{errorMessage || "Unable to connect to TokTickIT API"}</p>
        </div>
      )}
    </div>
  );
}

