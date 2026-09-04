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
 * Fetch all categories for ticket classification.
 */
export async function fetchCategories(): Promise<Category[]> {
  let res: Response;
  try {
    res = await fetch("/api/categories");
  } catch {
    throw new Error("Unable to load request categories. Please check your connection.");
  }

  if (!res.ok) {
    throw new Error("Failed to load request categories.");
  }

  const data: Category[] = await res.json();
  return data;
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

/**
 * Submit a new IT support ticket under the active requester's identity.
 */
export async function createTicket(
  ticketData: {
    title: string;
    description: string;
    categoryId: number;
    relatedSystem?: string | null;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    attachments?: Array<{
      fileName: string;
      fileSize: number;
      fileType: string;
      fileUrl: string;
    }>;
  },
  requesterId: number
) {
  let res: Response;
  try {
    res = await fetch("/api/tickets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-requester-id": String(requesterId),
      },
      body: JSON.stringify(ticketData),
    });
  } catch {
    throw new Error("Unable to connect to TokTickIT API.");
  }

  if (!res.ok) {
    let errorMsg = "Failed to create ticket.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Fetch paginated tickets for the active requester with optional filters, search, and sorting.
 */
export async function fetchTickets(
  requesterId: number,
  options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    categoryId?: number | string;
    sortBy?: string;
    sortOrder?: string;
  } = {}
) {
  const queryParams = new URLSearchParams();
  if (options.page) queryParams.set("page", String(options.page));
  if (options.limit) queryParams.set("limit", String(options.limit));
  if (options.search && options.search.trim()) queryParams.set("search", options.search.trim());
  if (options.status && options.status !== "ALL") queryParams.set("status", options.status);
  if (options.priority && options.priority !== "ALL") queryParams.set("priority", options.priority);
  if (options.categoryId && options.categoryId !== "ALL") queryParams.set("categoryId", String(options.categoryId));
  if (options.sortBy) queryParams.set("sortBy", options.sortBy);
  if (options.sortOrder) queryParams.set("sortOrder", options.sortOrder);

  const url = `/api/tickets${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "x-requester-id": String(requesterId),
      },
    });
  } catch {
    throw new Error("Unable to load tickets. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Failed to load tickets.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Fetch full ticket details for a single ticket by numeric ID or Ticket Number.
 */
export async function fetchTicketById(ticketIdOrNumber: number | string, requesterId: number) {
  let res: Response;
  try {
    res = await fetch(`/api/tickets/${encodeURIComponent(String(ticketIdOrNumber))}`, {
      headers: {
        "x-requester-id": String(requesterId),
      },
    });
  } catch {
    throw new Error("Unable to load ticket details. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Ticket not found or you do not have permission to view it.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore parse error
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Fetch all attachments (including soft-removed metadata) for a single ticket.
 */
export async function fetchTicketAttachments(ticketIdOrNumber: number | string, requesterId: number) {
  let res: Response;
  try {
    res = await fetch(`/api/tickets/${encodeURIComponent(String(ticketIdOrNumber))}/attachments`, {
      headers: {
        "x-requester-id": String(requesterId),
      },
    });
  } catch {
    throw new Error("Unable to load ticket attachments. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Failed to load ticket attachments.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Upload an attachment to an existing ticket.
 */
export async function uploadTicketAttachment(
  ticketIdOrNumber: number | string,
  file: File,
  requesterId: number
) {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`/api/tickets/${encodeURIComponent(String(ticketIdOrNumber))}/attachments`, {
      method: "POST",
      headers: {
        "x-requester-id": String(requesterId),
      },
      body: formData,
    });
  } catch {
    throw new Error("Unable to upload attachment. Please check your network connection.");
  }

  if (!res.ok) {
    let errorMsg = "Unable to upload attachment. Please try again.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}

/**
 * Download an active attachment file.
 */
export async function downloadAttachment(attachmentId: number, fileName: string, requesterId: number) {
  let res: Response;
  try {
    res = await fetch(`/api/attachments/${attachmentId}/download`, {
      headers: {
        "x-requester-id": String(requesterId),
      },
    });
  } catch {
    throw new Error("Unable to download attachment. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Unable to download attachment.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Soft-remove an attachment from a ticket with optional reason.
 */
export async function removeAttachment(attachmentId: number, requesterId: number, reason?: string) {
  let res: Response;
  try {
    res = await fetch(`/api/attachments/${attachmentId}`, {
      method: "DELETE",
      headers: {
        "x-requester-id": String(requesterId),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    });
  } catch {
    throw new Error("Unable to remove attachment. Please check your connection.");
  }

  if (!res.ok) {
    let errorMsg = "Unable to remove attachment.";
    try {
      const errJson = await res.json();
      if (errJson.message) errorMsg = errJson.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return await res.json();
}


