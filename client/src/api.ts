export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

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

