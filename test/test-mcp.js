/**
 * 测试 Swagger Codegen MCP
 *
 * 运行方式: node test/test-mcp.js
 */

import fetch from "node-fetch";
import {
  fetchSwaggerDoc,
  getAllTags,
  getEndpointsByTag,
  getEndpointDetail,
} from "../src/swagger-parser.js";
import {
  generateApiModule,
  generateSingleEndpointCode,
} from "../src/code-generator.js";

const SWAGGER_URL = "https://dvs-dev2.utuapp.cn/api/village/swagger.json";

async function test() {
  console.log("=== 测试 Swagger Codegen MCP ===\n");

  try {
    // 1. 获取Swagger文档
    console.log("1. 获取Swagger文档...");
    const swaggerDoc = await fetchSwaggerDoc(SWAGGER_URL);
    console.log("   ✓ 成功获取Swagger文档");
    console.log(`   - 标题: ${swaggerDoc.info?.title}`);
    console.log(`   - 版本: ${swaggerDoc.info?.version}`);

    // 2. 获取所有tags
    console.log("\n2. 获取所有tags...");
    const tags = getAllTags(swaggerDoc);
    console.log(`   ✓ 共找到 ${tags.length} 个tags`);
    console.log(
      "   - 前10个tags:",
      tags
        .slice(0, 10)
        .map((t) => t.name)
        .join(", ")
    );

    // 3. 获取VillageNursing的接口
    console.log("\n3. 获取VillageNursing的接口...");
    const endpoints = getEndpointsByTag(swaggerDoc, "VillageNursing");
    console.log(`   ✓ 共找到 ${endpoints.length} 个接口`);
    endpoints.forEach((ep) => {
      console.log(`   - ${ep.method.padEnd(6)} ${ep.path}`);
      console.log(`     ${ep.summary}`);
    });

    // 4. 获取单个接口详情
    if (endpoints.length > 0) {
      console.log("\n4. 获取第一个接口详情...");
      const firstEndpoint = endpoints[0];
      const detail = getEndpointDetail(
        swaggerDoc,
        firstEndpoint.path,
        firstEndpoint.method
      );
      console.log(`   ✓ 接口: ${detail.method} ${detail.path}`);
      console.log(`   - 参数数量: ${detail.parameters.length}`);
      if (detail.parameters.length > 0) {
        console.log("   - 参数列表:");
        detail.parameters.forEach((p) => {
          console.log(
            `     * ${p.name} (${p.in}): ${p.description || "无描述"}`
          );
        });
      }
    }

    // 5. 生成代码
    console.log("\n5. 生成VillageNursing模块代码...");
    const module = generateApiModule(endpoints, swaggerDoc, "VillageNursing");
    console.log(`   ✓ 生成完成`);
    console.log(
      `   - 类型文件: ${module.typesFileName} (${module.typesContent.length} 字符)`
    );
    console.log(
      `   - API文件: ${module.apiFileName} (${module.apiContent.length} 字符)`
    );

    // 打印生成的代码
    console.log("\n=== 生成的类型定义 ===\n");
    console.log(module.typesContent.substring(0, 2000));
    if (module.typesContent.length > 2000) {
      console.log(`\n... 省略 ${module.typesContent.length - 2000} 字符 ...`);
    }

    console.log("\n=== 生成的API代码 ===\n");
    console.log(module.apiContent.substring(0, 2000));
    if (module.apiContent.length > 2000) {
      console.log(`\n... 省略 ${module.apiContent.length - 2000} 字符 ...`);
    }

    console.log("\n=== 测试完成 ===");
  } catch (error) {
    console.error("测试失败:", error);
    process.exit(1);
  }
}

test();
