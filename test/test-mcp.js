/**
 * 测试 /api/basic/Article/SetOrder 接口
 * 验证自动推断服务功能
 */

import fetch from "node-fetch";
import { getSwaggerUrlByPath } from "../src/swagger-config.js";

const TARGET_PATH = "/api/basic/Article/SetOrder";

async function testEndpoint() {
  console.log("=== 测试接口: " + TARGET_PATH + " ===\n");

  // 1. 自动推断服务
  const swaggerUrl = getSwaggerUrlByPath(TARGET_PATH);
  console.log("1. 自动推断的 Swagger URL:");
  console.log("   " + swaggerUrl);

  // 2. 获取 Swagger 文档
  console.log("\n2. 获取 Swagger 文档...");
  const response = await fetch(swaggerUrl);
  const swaggerDoc = await response.json();
  console.log("   文档标题: " + (swaggerDoc.info?.title || "未知"));
  console.log("   文档版本: " + (swaggerDoc.info?.version || "未知"));

  // 3. 查找接口定义
  console.log("\n3. 查找接口定义...");
  const pathDef = swaggerDoc.paths?.[TARGET_PATH];

  if (!pathDef) {
    // 尝试模糊匹配
    console.log("   未找到精确路径，尝试模糊匹配...");
    const matchedPaths = Object.keys(swaggerDoc.paths || {}).filter((p) =>
      p.toLowerCase().includes("article/setorder")
    );
    if (matchedPaths.length > 0) {
      console.log("   匹配到的路径:", matchedPaths);
    } else {
      console.log("   未找到任何匹配的路径");

      // 列出所有 Article 相关的路径
      const articlePaths = Object.keys(swaggerDoc.paths || {}).filter((p) =>
        p.toLowerCase().includes("article")
      );
      if (articlePaths.length > 0) {
        console.log("\n   Article 相关的所有路径:");
        articlePaths.forEach((p) => console.log("   - " + p));
      }
    }
    return;
  }

  // 4. 打印接口详情
  console.log("   找到接口定义!\n");

  for (const [method, operation] of Object.entries(pathDef)) {
    if (typeof operation !== "object") continue;

    console.log(`4. ${method.toUpperCase()} ${TARGET_PATH}`);
    console.log("   摘要: " + (operation.summary || "无"));
    console.log("   标签: " + (operation.tags?.join(", ") || "无"));

    // 参数
    if (operation.parameters && operation.parameters.length > 0) {
      console.log("\n   参数:");
      operation.parameters.forEach((param) => {
        console.log(
          `   - ${param.name} (${param.in}): ${
            param.type || param.schema?.type || "object"
          } ${param.required ? "[必需]" : "[可选]"}`
        );
      });
    }

    // 请求体 (Swagger 2.x)
    const bodyParam = operation.parameters?.find((p) => p.in === "body");
    if (bodyParam) {
      console.log("\n   请求体:");
      if (bodyParam.schema?.$ref) {
        const modelName = bodyParam.schema.$ref.split("/").pop();
        console.log("   - 类型: " + modelName);

        // 查找模型定义
        const modelDef = swaggerDoc.definitions?.[modelName];
        if (modelDef?.properties) {
          console.log("   - 属性:");
          for (const [propName, propDef] of Object.entries(
            modelDef.properties
          )) {
            const required = modelDef.required?.includes(propName)
              ? "[必需]"
              : "[可选]";
            console.log(
              `     - ${propName}: ${
                propDef.type || propDef.$ref?.split("/").pop() || "object"
              } ${required}`
            );
          }
        }
      }
    }

    // 响应
    if (operation.responses) {
      console.log("\n   响应:");
      for (const [code, resp] of Object.entries(operation.responses)) {
        console.log(`   - ${code}: ${resp.description || "无描述"}`);
        if (resp.schema?.$ref) {
          console.log("     类型: " + resp.schema.$ref.split("/").pop());
        }
      }
    }
  }
}

testEndpoint().catch(console.error);
