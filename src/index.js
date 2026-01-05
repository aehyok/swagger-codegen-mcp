#!/usr/bin/env node

/**
 * Swagger API 代码生成器 MCP 服务器
 *
 * 功能：
 * 1. list_tags - 列出Swagger中所有API分组
 * 2. list_endpoints - 列出指定tag的所有接口
 * 3. get_endpoint_detail - 获取单个接口详情
 * 4. generate_api_code - 生成TypeScript API代码
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  fetchSwaggerDoc,
  getAllTags,
  getEndpointsByTag,
  getEndpointDetail,
} from "./swagger-parser.js";

import {
  generateApiModule,
  generateSingleEndpointCode,
} from "./code-generator.js";

// 默认Swagger URL
const DEFAULT_SWAGGER_URL =
  "https://dvs-dev2.utuapp.cn/api/village/swagger.json";

// 创建MCP服务器
const server = new Server(
  {
    name: "swagger-codegen-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义可用的工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_tags",
        description:
          "列出Swagger文档中所有的API分组（tags）。每次调用都会获取最新的Swagger文档。",
        inputSchema: {
          type: "object",
          properties: {
            swagger_url: {
              type: "string",
              description: "Swagger JSON文档的URL（可选，默认使用预设URL）",
            },
          },
          required: [],
        },
      },
      {
        name: "list_endpoints",
        description:
          "列出指定tag下的所有API接口。每次调用都会获取最新的Swagger文档。",
        inputSchema: {
          type: "object",
          properties: {
            swagger_url: {
              type: "string",
              description: "Swagger JSON文档的URL（可选，默认使用预设URL）",
            },
            tag: {
              type: "string",
              description: 'API分组的tag名称，如 "VillageNursing"',
            },
          },
          required: ["tag"],
        },
      },
      {
        name: "get_endpoint_detail",
        description: "获取单个API接口的详细信息，包括参数和响应定义。",
        inputSchema: {
          type: "object",
          properties: {
            swagger_url: {
              type: "string",
              description: "Swagger JSON文档的URL（可选，默认使用预设URL）",
            },
            path: {
              type: "string",
              description:
                'API接口路径，如 "/api/village/VillageNursing/GetPageList"',
            },
            method: {
              type: "string",
              description: 'HTTP方法，如 "get", "post", "put", "delete"',
              enum: ["get", "post", "put", "delete", "patch"],
            },
          },
          required: ["path", "method"],
        },
      },
      {
        name: "generate_api_code",
        description:
          "生成TypeScript API代码。可以按tag生成整个模块，或按单个接口生成。生成的代码兼容项目的request.js封装。",
        inputSchema: {
          type: "object",
          properties: {
            swagger_url: {
              type: "string",
              description: "Swagger JSON文档的URL（可选，默认使用预设URL）",
            },
            tag: {
              type: "string",
              description: "按tag生成整个模块的代码（与path/method二选一）",
            },
            path: {
              type: "string",
              description: "生成单个接口的代码（与tag二选一）",
            },
            method: {
              type: "string",
              description: "配合path使用的HTTP方法",
              enum: ["get", "post", "put", "delete", "patch"],
            },
          },
          required: [],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const swaggerUrl = args?.swagger_url || DEFAULT_SWAGGER_URL;

  try {
    // 每次调用都获取最新的Swagger文档
    console.error(`[INFO] Fetching Swagger doc from: ${swaggerUrl}`);
    const swaggerDoc = await fetchSwaggerDoc(swaggerUrl);
    console.error(`[INFO] Swagger doc fetched successfully`);

    switch (name) {
      case "list_tags": {
        const tags = getAllTags(swaggerDoc);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  total: tags.length,
                  tags: tags,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_endpoints": {
        const tag = args.tag;
        if (!tag) {
          throw new Error("缺少必需参数: tag");
        }

        const endpoints = getEndpointsByTag(swaggerDoc, tag);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  tag: tag,
                  total: endpoints.length,
                  endpoints: endpoints.map((ep) => ({
                    path: ep.path,
                    method: ep.method,
                    summary: ep.summary,
                    operationId: ep.operationId,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_endpoint_detail": {
        const { path, method } = args;
        if (!path || !method) {
          throw new Error("缺少必需参数: path 和 method");
        }

        const detail = getEndpointDetail(swaggerDoc, path, method);
        if (!detail) {
          throw new Error(`未找到接口: ${method.toUpperCase()} ${path}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  endpoint: detail,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "generate_api_code": {
        const { tag, path, method } = args;

        if (!tag && !path) {
          throw new Error("必须提供 tag 或 path+method 参数");
        }

        if (path) {
          // 生成单个接口的代码
          const methodStr = method || "get";
          const endpoint = getEndpointDetail(swaggerDoc, path, methodStr);
          if (!endpoint) {
            throw new Error(`未找到接口: ${methodStr.toUpperCase()} ${path}`);
          }

          const code = generateSingleEndpointCode(endpoint, swaggerDoc);
          return {
            content: [
              {
                type: "text",
                text: `生成的代码（单个接口）:\n\n\`\`\`typescript\n${code}\n\`\`\``,
              },
            ],
          };
        } else {
          // 按tag生成整个模块
          const endpoints = getEndpointsByTag(swaggerDoc, tag);
          if (endpoints.length === 0) {
            throw new Error(`未找到tag "${tag}" 下的任何接口`);
          }

          const module = generateApiModule(endpoints, swaggerDoc, tag);

          return {
            content: [
              {
                type: "text",
                text: `生成的代码（${tag} 模块，共 ${endpoints.length} 个接口）:

## 文件1: ${module.typesFileName}

\`\`\`typescript
${module.typesContent}
\`\`\`

## 文件2: ${module.apiFileName}

\`\`\`typescript
${module.apiContent}
\`\`\``,
              },
            ],
          };
        }
      }

      default:
        throw new Error(`未知的工具: ${name}`);
    }
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: false,
              error: error.message,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  console.error("[INFO] Starting Swagger Codegen MCP Server...");
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[INFO] Server connected and ready");
}

main().catch((error) => {
  console.error("[FATAL]", error);
  process.exit(1);
});
