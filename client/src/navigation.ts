import { useEffect, useState } from "react";
export function navigate(path: string) {
  if (window.location.pathname + window.location.search === path) return;
  window.history.pushState({ tocktickit: true }, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
export function useLocation() {
  const [location, setLocation] = useState(() => ({ pathname: window.location.pathname, search: window.location.search }));
  useEffect(() => { const update = () => setLocation({ pathname: window.location.pathname, search: window.location.search }); window.addEventListener("popstate", update); return () => window.removeEventListener("popstate", update); }, []);
  return location;
}
export function useUrlFilter(key: string, fallback: string): [string, (value: string) => void] {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const value = key === "status" && params.get("statusGroup") === "open" ? "OPEN_GROUP" : params.get(key) || fallback;
  return [value, next => {
    const query = new URLSearchParams(window.location.search);
    if (key === "status") {
      query.delete("statusGroup");
      if (next === "OPEN_GROUP") { query.set("statusGroup", "open"); query.delete("status"); }
      else if (next === fallback) query.delete(key); else query.set(key, next);
    } else if (next === fallback || !next) query.delete(key); else query.set(key, next);
    const text = query.toString(); navigate(window.location.pathname + (text ? "?" + text : ""));
  }];
}
