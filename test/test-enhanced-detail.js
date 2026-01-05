/**
 * 测试 get_endpoint_detail 增强功能
 * 验证是否能正确返回关联的模型定义
 */

import {
  fetchSwaggerDoc,
  getEndpointDetail,
  resolveAllRefsForEndpoint,
} from "../src/swagger-parser.js";

const SWAGGER_URL = "https://dvs-dev2.utuapp.cn/api/village/swagger.json";
const TARGET_PATH = "/api/village/VillageNursing/GetNursingStats";
const TARGET_METHOD = "post";

async function testEnhancedEndpointDetail() {
  console.log("=== 测试 get_endpoint_detail 增强功能 ===\n");

  try {
    console.log("1. 获取 Swagger 文档...");
    const swaggerDoc = await fetchSwaggerDoc(SWAGGER_URL);
    console.log("   ✓ 成功获取 Swagger 文档");

    console.log(
      `\n2. 获取接口详情: ${TARGET_METHOD.toUpperCase()} ${TARGET_PATH}`
    );
    const detail = getEndpointDetail(swaggerDoc, TARGET_PATH, TARGET_METHOD);

    if (!detail) {
      console.log("   ✗ 未找到接口");
      return;
    }

    console.log("   ✓ 成功获取接口详情");
    console.log(`   - summary: ${detail.summary}`);
    console.log(`   - 参数数量: ${detail.parameters.length}`);

    console.log("\n3. 解析关联的模型定义...");
    const relatedModels = resolveAllRefsForEndpoint(swaggerDoc, detail);
    const modelNames = Object.keys(relatedModels);

    console.log(`   ✓ 共找到 ${modelNames.length} 个关联模型`);
    console.log("   - 模型列表:");
    modelNames.forEach((name) => {
      const model = relatedModels[name];
      const propCount = model.properties
        ? Object.keys(model.properties).length
        : 0;
      console.log(`     * ${name} (${propCount} 个属性)`);
    });

    // 显示每个模型的详细定义
    console.log("\n=== 模型定义详情 ===\n");
    modelNames.forEach((name) => {
      console.log(`--- ${name} ---`);
      console.log(JSON.stringify(relatedModels[name], null, 2));
      console.log("");
    });

    console.log("=== 测试完成 ===");
  } catch (error) {
    console.error("测试失败:", error);
    process.exit(1);
  }
}

testEnhancedEndpointDetail();
