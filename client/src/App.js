import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [categories, setCategories] = useState([]);
    async function handleCheck() {
        setState("loading");
        setErrorMessage("");
        try {
            const result = await checkSystem();
            setCategories(result.categories);
            setState("success");
        }
        catch (err) {
            setState("error");
            setErrorMessage(err instanceof Error ? err.message : "Unable to connect to TokTickIT API");
        }
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [
        _jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }),
        _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }),
        state === "loading" && _jsx("p", { className: "mt-3 mb-0", children: "Checking system..." }),
        state === "success" && _jsxs("div", { className: "mt-3", children: [
            _jsx("p", { className: "mb-2", children: "System Status: Online" }),
            categories.length > 0 && _jsx("ul", { className: "list-group", children: categories.map((cat) => _jsx("li", { className: "list-group-item", children: cat.name }, cat.id)) })
        ] }),
        state === "error" && _jsxs("div", { className: "mt-3 text-danger", children: [_jsx("p", { className: "mb-1", children: "System Status: Offline" }), _jsx("p", { className: "mb-0", children: errorMessage || "Unable to connect to TokTickIT API" })] })
    ] }));
}

