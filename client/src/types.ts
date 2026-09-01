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
