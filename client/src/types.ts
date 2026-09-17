export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  email: string;
  name: string;
  fullName?: string;
  department?: string | null;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  token?: string;
  user: User;
  message?: string;
}

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

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
  removalReason?: string | null;
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
  itPriority?: TicketPriority;
  ownerId?: number | null;
  owner?: { id: number; name: string; email: string; role: string } | null;
  problemAppearsResolved?: boolean;
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


export interface StaffQueueCounts {
  all: number;
  unassigned: number;
  myTickets: number;
  inProgress: number;
}

export interface StaffTicketSummary extends Ticket {
  summary?: string;
  requestedPriority?: TicketPriority;
}

export interface StaffTicketQueueResponse {
  data: StaffTicketSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counts: StaffQueueCounts;
}

export interface CommentAuthor {
  id: number;
  name?: string;
  fullName?: string;
  email?: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  avatarUrl?: string | null;
}

export interface TicketComment {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  authorId?: number;
  author: CommentAuthor;
}

export interface InternalNote {
  id: number;
  ticketId: number;
  body: string;
  createdAt: string;
  authorId?: number;
  author: CommentAuthor;
}
