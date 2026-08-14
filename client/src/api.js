export async function checkSystem() {
    const response = await fetch("/api/health");
    if (!response.ok) {
        throw new Error("Health check failed");
    }
    return { online: true, categories: [] };
}
