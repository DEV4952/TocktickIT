import { Category, Requester, SystemStatus } from "./types.js";

export type { Category, Requester, SystemStatus };

export async function checkSystem(): Promise<SystemStatus> {
  let healthResponse: Response;
  try {
    healthResponse = await fetch("/api/health");
  } catch {
    throw new Error("Unable to connect to TokTickIT API");
  }

  if (!healthResponse.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  let categoriesResponse: Response;
  try {
    categoriesResponse = await fetch("/api/categories");
  } catch {
    throw new Error("Unable to load request categories.");
  }

  if (!categoriesResponse.ok) {
    throw new Error("Unable to load request categories.");
  }

  const categories: Category[] = await categoriesResponse.json();

  return { online: true, categories };
}

/**
 * Fetch all active Development Requesters for the switcher / selector.
 */
export async function fetchActiveRequesters(): Promise<Requester[]> {
  let res: Response;
  try {
    res = await fetch("/api/requesters");
  } catch {
    throw new Error("Failed to load development requesters. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Failed to load development requesters.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  const data: Requester[] = await res.json();
  return data;
}

/**
 * Fetch current requester profile using the x-requester-id header.
 */
export async function fetchCurrentRequester(requesterId: number): Promise<Requester> {
  let res: Response;
  try {
    res = await fetch("/api/requesters/me", {
      headers: {
        "x-requester-id": String(requesterId),
      },
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API.");
  }

  if (!res.ok) {
    let errorMsg = "Failed to load requester profile.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorMsg);
  }

  const data: Requester = await res.json();
  return data;
}
