export interface Requester {
  id: number;
  name: string;
  email: string;
  department: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  createdAt?: string;
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  relatedSystem?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: number;
  category: Category;
  requesterId: number;
  requester: Requester;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  title?: string;
  summary?: string;
  description: string;
  categoryId: number;
  relatedSystem?: string | null;
  priority?: TicketPriority;
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    fileType: string;
    fileUrl: string;
  }>;
}

export interface TicketSummary {
  id: number;
  ticketNumber: string;
  title: string;
  description: string;
  relatedSystem?: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: number;
  category: { id: number; name: string };
  requesterId: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TicketMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

export interface PaginatedTicketsResponse {
  data: TicketSummary[];
  pagination: PaginationMetadata;
  metrics: TicketMetrics;
}

export interface TicketQueryOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  categoryId?: number | string;
  sortBy?: "createdAt" | "updatedAt" | "priority" | "ticketNumber" | "title";
  sortOrder?: "asc" | "desc";
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    issue: string;
  }>;
}
