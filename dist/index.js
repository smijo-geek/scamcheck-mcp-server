#!/usr/bin/env node
"use strict";
/**
 * ScamCheck MCP Server
 * Allows AI assistants (Claude, GPT, Cursor, etc.) to scan messages for scams.
 *
 * Setup:
 *   SCAMCHECK_API_KEY=sk-live-... node dist/index.js
 *
 * Submit to: https://smithery.ai / https://mcpt.ai / https://opentools.ai
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const API_BASE = process.env.SCAMCHECK_API_URL ?? "https://www.scamcheck.tech";
const API_KEY = process.env.SCAMCHECK_API_KEY ?? "";
// Keyless mode uses the public anonymous endpoint (IP rate-limited). An API
// key from https://www.scamcheck.tech/dashboard/developer unlocks higher limits.
if (!API_KEY) {
    process.stderr.write("ScamCheck: running in free anonymous mode (rate-limited). " +
        "Set SCAMCHECK_API_KEY for higher limits — https://www.scamcheck.tech/dashboard/developer\n");
}
const server = new index_js_1.Server({ name: "scamcheck", version: "1.1.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "scan_message",
            description: "Scan a suspicious message, URL, or text for scam indicators using ScamCheck AI. " +
                "Returns a verdict (Likely Scam / Suspicious / Likely Safe), risk score (0-100), " +
                "category, confidence, reasons flagged, and recommended actions. " +
                "Use this whenever a user shares a message they received and wants to know if it's a scam.",
            inputSchema: {
                type: "object",
                properties: {
                    input: {
                        type: "string",
                        description: "The message, URL, or text to scan. Minimum 8 characters. " +
                            "Can be SMS, email, WhatsApp message, job offer, or any suspicious content.",
                    },
                    source: {
                        type: "string",
                        enum: ["text", "url", "screenshot"],
                        description: "The type of content: 'text' for messages/emails, 'url' for links, 'screenshot' for OCR-extracted text. Default: text.",
                        default: "text",
                    },
                },
                required: ["input"],
            },
        },
    ],
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name !== "scan_message") {
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
    const args = request.params.arguments;
    const input = args.input?.trim();
    const source = args.source ?? "text";
    if (!input || input.length < 8) {
        return {
            content: [
                {
                    type: "text",
                    text: "Error: input must be at least 8 characters.",
                },
            ],
            isError: true,
        };
    }
    try {
        // With a key: authenticated v1 endpoint (higher limits). Without: the
        // public anonymous endpoint (same engine, IP rate-limited).
        const endpoint = API_KEY ? `${API_BASE}/api/v1/scan` : `${API_BASE}/api/scan`;
        const headers = { "Content-Type": "application/json" };
        if (API_KEY)
            headers.Authorization = `Bearer ${API_KEY}`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({ input, source }),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 429 && !API_KEY) {
                throw new Error("Free anonymous rate limit reached. Get a free API key for higher limits: " +
                    "https://www.scamcheck.tech/dashboard/developer");
            }
            throw new Error(errData.error ?? `API error: ${response.status}`);
        }
        const raw = await response.json();
        const data = {
            ...raw,
            next_steps: raw.next_steps ?? [],
            recovery_steps: raw.recovery_steps ?? [],
            // The anonymous endpoint returns scanId instead of a ready-made URL.
            result_url: raw.result_url ?? (raw.scanId ? `${API_BASE}/result/${raw.scanId}` : null),
        };
        const riskEmoji = data.risk === "high" ? "🔴" :
            data.risk === "medium" ? "🟠" :
                data.risk === "low" ? "🟡" : "🟢";
        const output = [
            `${riskEmoji} **${data.verdict}** — Risk Score: ${data.score}/100`,
            `Category: ${data.category.replace(/_/g, " ")} · Confidence: ${data.confidence}%`,
            "",
            `**Summary:** ${data.summary}`,
            "",
            "**Why this was flagged:**",
            ...[...new Set(data.reasons)].map((r) => `• ${r}`),
            "",
            "**What to do:**",
            ...data.next_steps.map((s) => `✓ ${s}`),
        ];
        if (data.recovery_steps.length > 0) {
            output.push("", "**If you already acted:**");
            output.push(...data.recovery_steps.map((s) => `! ${s}`));
        }
        if (data.result_url) {
            output.push("", `**Full report:** ${data.result_url}`);
        }
        return {
            content: [{ type: "text", text: output.join("\n") }],
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        return {
            content: [{ type: "text", text: `ScamCheck scan failed: ${message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("ScamCheck MCP server running. Ready to scan messages.\n");
}
main().catch((err) => {
    process.stderr.write(`Fatal: ${String(err)}\n`);
    process.exit(1);
});
