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
