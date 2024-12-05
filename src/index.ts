#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { ValidationCloudAPI } from "./api.js";
import { ValidationCloudError } from "./types.js";

dotenv.config();

class ValidationCloudServer {
  private server: Server;
  private validationCloudApi: ValidationCloudAPI;

  constructor() {
    console.error('[ValidationCloudServer] Starting server initialization');

    const apiKey = process.env.VALIDATION_CLOUD_API_KEY;
    if (!apiKey) {
      console.error('[ValidationCloudServer] Missing API key');
      throw new Error('VALIDATION_CLOUD_API_KEY environment variable is required');
    }
    console.error('[ValidationCloudServer] API key found, length:', apiKey.length);

    this.validationCloudApi = new ValidationCloudAPI({ apiKey });

    const ethereumTool = {
      name: "ethereum_request",
      description: "Make Ethereum JSON-RPC requests using Validation Cloud",
      inputSchema: {
        type: "object",
        properties: {
          method: { type: "string" },
          params: {
            type: "array",
            items: {}
          }
        },
        required: ["method"]
      }
    };

    console.error('[ValidationCloudServer] Creating MCP server');
    this.server = new Server(
      {
        name: "validation-cloud-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {
            ethereum_request: ethereumTool
          },
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
    console.error('[ValidationCloudServer] Server initialization complete');
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error("[ValidationCloudServer] MCP Error:", error);
    };

    process.on('SIGINT', async () => {
      console.error('[ValidationCloudServer] Received SIGINT, shutting down');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    console.error('[ValidationCloudServer] Setting up request handlers');
    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('[ValidationCloudServer] Handling list_tools request');
      return {
        tools: [
          {
            name: "ethereum_request",
            description: "Make Ethereum JSON-RPC requests using Validation Cloud",
            inputSchema: {
              type: "object",
              properties: {
                method: { type: "string" },
                params: {
                  type: "array",
                  items: {}
                }
              },
              required: ["method"]
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error('[ValidationCloudServer] Received tool call request:', JSON.stringify(request, null, 2));

      if (request.params.name === "ethereum_request") {
        console.error('[ValidationCloudServer] Processing ethereum_request');

        if (!request.params.arguments || typeof request.params.arguments !== 'object') {
          console.error('[ValidationCloudServer] Invalid arguments format');
          throw new McpError(ErrorCode.InvalidParams, "Invalid arguments for ethereum_request");
        }

        const { method, params } = request.params.arguments as { method: string; params?: any[] };
        console.error('[ValidationCloudServer] Extracted method and params:', { method, params });

        if (typeof method !== 'string') {
          console.error('[ValidationCloudServer] Invalid method type');
          throw new McpError(ErrorCode.InvalidParams, "Method must be a string");
        }

        try {
          console.error('[ValidationCloudServer] Making API request');
          const results = await this.validationCloudApi.request({
            method,
            params: params || []
          });
          console.error('[ValidationCloudServer] API request successful:', results);
          return { toolResult: results };
        } catch (error) {
          console.error('[ValidationCloudServer] API request failed:', error);
          if (error instanceof ValidationCloudError) {
            return {
              content: [{ type: "text", text: `Validation Cloud API error: ${error.message}` }],
              isError: true,
            };
          }
          throw error;
        }
      }

      console.error('[ValidationCloudServer] Unknown tool requested:', request.params.name);
      throw new McpError(ErrorCode.MethodNotFound, "Unknown tool");
    });
  }

  async run(): Promise<void> {
    console.error('[ValidationCloudServer] Starting server');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[ValidationCloudServer] Server running on stdio');
  }
}

console.error('[ValidationCloudServer] Creating server instance');
const server = new ValidationCloudServer();
server.run().catch(error => {
  console.error('[ValidationCloudServer] Server failed to start:', error);
});
