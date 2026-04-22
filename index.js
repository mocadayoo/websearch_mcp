import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { log } from "./Utils/logger.js";
import {
    duckduckSearch,
    fetchWebsite,
    websiteReader,
} from "./logic/webModule.js";

log("starting mcp server...");
const server = new Server({
    name: "websearch_mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    log("received toollist request");
    return {
        tools: [
            {
                name: "duckduckSearch",
                description: "Search using DuckDuckGo",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query",
                        },
                    },
                    required: ["query"],
                },
            },
            {
                name: "websiteReader",
                description:
                    "Fetch and extract the main content of a website (recommend)",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The URL of the website to reader",
                        },
                    },
                    required: ["url"],
                },
            },
            {
                name: "fetchWebsite",
                description: "Fetch the content of a website (full html)",
                inputSchema: {
                    type: "object",
                    properties: {
                        url: {
                            type: "string",
                            description: "The URL of the website to fetch",
                        },
                    },
                    required: ["url"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    log("received tool call request: " + request.params.name);
    try {
        if (request.params.arguments.url) {
            if (
                !request.params.arguments.url.startsWith("http://") &&
                !request.params.arguments.url.startsWith("https://")
            ) {
                throw new Error(
                    "Invalid URL: must start with http:// or https://",
                );
            } else {
                const urlObj = new URL(request.params.arguments.url);
                const hostname = urlObj.hostname;
                if (
                    hostname === "localhost" || hostname === "127.0.0.1" ||
                    hostname === "::1" || hostname.startsWith("192.168.") ||
                    hostname.startsWith("10.") || hostname.startsWith("172.16.")
                ) {
                    throw new Error(
                        "Invalid URL: local addresses are not allowed",
                    );
                }
            }
        }

        if (request.params.name === "duckduckSearch") {
            const result = await duckduckSearch(request.params.arguments.query);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                isError: false,
            };
        } else if (request.params.name === "websiteReader") {
            const result = await websiteReader(request.params.arguments.url);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                isError: false,
            };
        } else if (request.params.name === "fetchWebsite") {
            const result = await fetchWebsite(request.params.arguments.url);
            return {
                content: [
                    {
                        type: "text",
                        text: result,
                    },
                ],
                isError: false,
            };
        }
        throw new Error(`unknown tool: ${request.params.name}`);
    } catch (error) {
        log("error in tool call: " + error.message);
        return {
            content: [
                {
                    type: "text",
                    text: `Error: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

const transport = new StdioServerTransport();
log("starting server...");
await server.connect(transport);
log("server is ready!");
