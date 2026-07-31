/**
 * API helper — centralized fetch wrapper.
 * All components import API_BASE and use these helpers instead of raw fetch().
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * GET request helper with error handling.
 */
export async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.details || `GET ${path} failed`);
    }
    return res.json();
}

/**
 * POST request helper with JSON body.
 */
export async function apiPost(path, body = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.details || `POST ${path} failed`);
    }
    return res.json();
}

/**
 * PATCH request helper.
 */
export async function apiPatch(path, body) {
    const opts = { method: "PATCH" };
    if (body !== undefined) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(`${API_BASE}${path}`, opts);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.details || `PATCH ${path} failed`);
    }
    return res.json();
}

/**
 * DELETE request helper.
 */
export async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || err.details || `DELETE ${path} failed`);
    }
    return res.json();
}

/**
 * Format a timestamp to relative time ("2 mins ago", "3 hours ago", etc.)
 */
export function timeAgo(dateString) {
    if (!dateString) return "";
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return then.toLocaleDateString();
}
