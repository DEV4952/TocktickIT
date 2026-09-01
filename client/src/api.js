export async function checkSystem() {
    let healthResponse;
    try {
        healthResponse = await fetch("/api/health");
    }
    catch {
        throw new Error("Unable to connect to TokTickIT API");
    }
    if (!healthResponse.ok) {
        throw new Error("Unable to connect to TokTickIT API");
    }
    let categoriesResponse;
    try {
        categoriesResponse = await fetch("/api/categories");
    }
    catch {
        throw new Error("Unable to load request categories.");
    }
    if (!categoriesResponse.ok) {
        throw new Error("Unable to load request categories.");
    }
    const categories = await categoriesResponse.json();
    return { online: true, categories };
}
