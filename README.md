# Swagger API 代码生成器 MCP

从 Swagger/OpenAPI 文档自动生成 TypeScript API 代码的 MCP 服务器。

## 功能

- **list_tags** - 列出 Swagger 中所有的 API 分组（tags）
- **list_endpoints** - 列出指定 tag 下的所有接口
- **get_endpoint_detail** - 获取单个接口的详细信息
- **generate_api_code** - 生成 TypeScript 代码（支持按 tag 或单个接口）

## 安装

```bash
cd C:\Users\Administrator\.gemini\mcp\swagger-codegen-mcp
npm install
```

## 配置 Gemini CLI

在 `settings.json` 中添加此 MCP 服务器：

```json
{
  "mcpServers": {
    "swagger-codegen": {
      "command": "node",
      "args": [
        "C:\\Users\\Administrator\\.gemini\\mcp\\swagger-codegen-mcp\\src\\index.js"
      ]
    }
  }
}
```

## 使用示例

### 1. 列出所有 API 分组

```
list_tags
```

返回示例：

```json
{
  "success": true,
  "total": 50,
  "tags": [
    { "name": "VillageNursing", "description": "" },
    { "name": "Accusation", "description": "" }
  ]
}
```

### 2. 列出指定分组的接口

```
list_endpoints(tag: "VillageNursing")
```

### 3. 生成整个模块的代码

```
generate_api_code(tag: "VillageNursing")
```

生成两个文件：

- `villagenursing.types.ts` - 类型定义
- `villagenursing.ts` - API 函数

### 4. 生成单个接口的代码

```
generate_api_code(
  path: "/api/village/VillageNursing/GetPageList",
  method: "get"
)
```

## 生成的代码风格

生成的代码兼容项目的 `request.js` 封装：

```typescript
import request from "@/common/utils/request";
import type {
  GetPageListParams,
  VillageNursingListDto,
} from "./villagenursing.types";

/** 查询列表 */
export function getPageList(
  params: GetPageListParams
): Promise<VillageNursingListDto[]> {
  return request("/api/village/VillageNursing/GetPageList", {
    method: "get",
    params: { RegionId, Limit, Page, Keyword },
  });
}
```

## 测试

```bash
npm test
```
