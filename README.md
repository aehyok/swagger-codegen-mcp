# Swagger API 代码生成器 MCP

从 Swagger/OpenAPI 文档自动生成 TypeScript API 代码的 MCP 服务器。

## 功能

- **list_services** - 列出所有可用的 API 服务及其 Swagger URL
- **list_tags** - 列出 Swagger 中所有的 API 分组（tags）
- **list_endpoints** - 列出指定 tag 下的所有接口
- **get_endpoint_detail** - 获取单个接口的详细信息
- **generate_api_code** - 生成 TypeScript 代码（支持按 tag 或单个接口）

## 支持的服务

MCP 服务器预配置了以下 API 服务，会根据 API 路径自动推断使用哪个服务：

| 服务名     | Swagger URL                    | 匹配路径示例                      |
| ---------- | ------------------------------ | --------------------------------- |
| village    | `/api/village/swagger.json`    | `/api/village/VillageNursing/...` |
| basic      | `/api/basic/swagger.json`      | `/api/basic/User/...`             |
| ffp        | `/api/ffp/swagger.json`        | `/api/ffp/Project/...`            |
| dynamic    | `/api/dynamic/swagger.json`    | `/api/dynamic/Form/...`           |
| customform | `/api/customform/swagger.json` | `/api/customform/Template/...`    |
| ncdp       | `/api/ncdp/swagger.json`       | `/api/ncdp/Report/...`            |
| gis        | `/api/gis/swagger.json`        | `/api/gis/Map/...`                |
| query      | `/api/query/swagger.json`      | `/api/query/Data/...`             |

> **提示**：当你传入 `path` 参数时（如 `/api/village/VillageNursing/GetNursingStats`），服务器会自动从路径中提取 `village` 并使用对应的 swagger.json，无需手动指定 `swagger_url`。

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

### 1. 列出所有可用服务

```
list_services()
```

返回示例：

```json
{
  "success": true,
  "total": 8,
  "services": [
    {
      "name": "village",
      "url": "https://dvs-dev2.utuapp.cn/api/village/swagger.json"
    },
    {
      "name": "basic",
      "url": "https://dvs-dev2.utuapp.cn/api/basic/swagger.json"
    }
  ],
  "hint": "使用 path 参数时会自动根据路径推断服务"
}
```

### 2. 列出所有 API 分组

```
list_tags()
```

返回示例：

```json
{
  "success": true,
  "swaggerUrl": "https://dvs-dev2.utuapp.cn/api/village/swagger.json",
  "total": 50,
  "tags": [
    { "name": "VillageNursing", "description": "" },
    { "name": "Accusation", "description": "" }
  ]
}
```

### 3. 列出指定分组的接口

```
list_endpoints(tag: "VillageNursing")
```

### 4. 获取接口详情（自动推断服务）

```
get_endpoint_detail(
  path: "/api/village/VillageNursing/GetNursingStats",
  method: "get"
)
```

> 无需指定 `swagger_url`，会自动从 path 中提取 `village` 并使用 village 服务的 swagger.json。

### 5. 生成整个模块的代码

```
generate_api_code(tag: "VillageNursing")
```

生成两个文件：

- `villagenursing.types.ts` - 类型定义
- `villagenursing.ts` - API 函数

### 6. 生成单个接口的代码（自动推断服务）

```
generate_api_code(
  path: "/api/basic/User/GetList",
  method: "get"
)
```

> 会自动使用 basic 服务的 swagger.json。

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

## 配置文件

服务端点配置位于 `src/swagger-config.js`，可以根据需要添加更多服务：

```javascript
const SWAGGER_SERVICES = {
  village: `${API_BASE_URL}/village/swagger.json`,
  basic: `${API_BASE_URL}/basic/swagger.json`,
  // 添加更多服务...
};
```

## 测试

```bash
# 运行配置测试
node test/test-config.js

# 查找模型定义
node test/find-model.js
```
