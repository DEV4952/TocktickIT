export interface SystemStatus {
  online: boolean;
  categories: never[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("Health check failed");
  }

  return { online: true, categories: [] };
}
