import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App.js";

import * as api from "../../src/api.js";

beforeEach(() => {
  vi.spyOn(api, "fetchActiveRequesters").mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", async () => {
    render(<App />);
    expect(await screen.findByText(/TokTickIT/i)).toBeInTheDocument();
  });

  it("shows System Status: Online and categories list on success", async () => {
    const mockCategories = [
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ];
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: mockCategories,
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Hardware")).toBeInTheDocument();
    expect(screen.getByText("Software")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows System Status: Offline when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Unable to connect to TokTickIT API"));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(await screen.findByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });

  it("shows useful error message when categories fail to load", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("Unable to load request categories."));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /check system/i }));

    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(await screen.findByText(/Unable to load request categories./i)).toBeInTheDocument();
  });
});
