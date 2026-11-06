/**
 * n8n Service — handles communication between the backend and n8n workflows.
 * 
 * Outbound: triggers n8n workflows via webhook HTTP calls.
 * Inbound:  n8n calls our /api/n8n/* endpoints (defined in n8n.routes.js).
 */

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";
const N8N_AUTH_HEADER = process.env.N8N_AUTH_HEADER || "";

/**
 * Trigger an n8n workflow via its webhook URL.
 * @param {string} webhookPath - The specific webhook path (appended to base URL), e.g. "/email-ingest"
 * @param {object} payload - Data to send to the workflow.
 * @returns {Promise<object>} n8n's response.
 */
export async function triggerWorkflow(webhookPath = "", payload = {}) {
    const url = webhookPath
        ? `${N8N_WEBHOOK_URL.replace(/\/+$/, "")}${webhookPath}`
        : N8N_WEBHOOK_URL;

    const headers = { "Content-Type": "application/json" };
    if (N8N_AUTH_HEADER) {
        headers["Authorization"] = `Bearer ${N8N_AUTH_HEADER}`;
    }

    const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`n8n webhook failed (${res.status}): ${text}`);
    }

    // n8n may return JSON or empty body
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return res.json();
    }
    return { status: "triggered", webhookPath };
}

/**
 * Trigger the email ingestion workflow in n8n.
 * n8n will fetch emails and POST them back to our /api/n8n/ingest-email endpoint.
 */
export async function triggerEmailIngestion() {
    return triggerWorkflow("/email-ingest", {
        action: "fetch-new-emails",
        timestamp: new Date().toISOString(),
    });
}

/**
 * Trigger a general processing workflow in n8n.
 */
export async function triggerProcessingWorkflow(data = {}) {
    return triggerWorkflow("/process", {
        action: "process-data",
        timestamp: new Date().toISOString(),
        ...data,
    });
}

/**
 * Validate the n8n webhook auth header on inbound requests.
 * Use as Express middleware on n8n routes.
 */
export function validateN8nAuth(req, res, next) {
    // If no auth token is configured, allow all requests (dev mode)
    if (!N8N_AUTH_HEADER) {
        return next();
    }

    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (token !== N8N_AUTH_HEADER) {
        return res.status(401).json({ error: "Unauthorized — invalid n8n auth token" });
    }

    next();
}
