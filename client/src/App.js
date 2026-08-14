import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { checkSystem } from "./api.js";
export default function App() {
    const [state, setState] = useState("idle");
    async function handleCheck() {
        setState("loading");
        try {
            await checkSystem();
            setState("success");
        }
        catch {
            setState("error");
        }
    }
    return (_jsxs("div", { className: "container py-5", style: { maxWidth: 640 }, children: [_jsxs("h1", { className: "h3 mb-4", children: ["TokTickIT ", _jsx("span", { className: "text-success", children: "IT Service Desk" })] }), _jsx("button", { className: "btn btn-success", onClick: handleCheck, disabled: state === "loading", children: state === "loading" ? "Loading…" : "Check System" }), state === "loading" && _jsx("p", { className: "mt-3 mb-0", children: "Checking system..." }), state === "success" && _jsx("p", { className: "mt-3 mb-0", children: "System Status: Online" }), state === "error" && _jsxs("div", { className: "mt-3 text-danger", children: [_jsx("p", { className: "mb-1", children: "System Status: Offline" }), _jsx("p", { className: "mb-0", children: "Unable to connect to TokTickIT API" })] })] }));
}
