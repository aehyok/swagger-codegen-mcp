/**
 * 调试：列出所有包含 NursingStats 的接口路径
 */

import { fetchSwaggerDoc } from "../src/swagger-parser.js";

const SWAGGER_URL = "https://dvs-dev2.utuapp.cn/api/village/swagger.json";

async function debug() {
  const swaggerDoc = await fetchSwaggerDoc(SWAGGER_URL);
  const paths = Object.keys(swaggerDoc.paths || {});

  console.log("=== 查找包含 NursingStats 的路径 ===\n");
  const matched = paths.filter((p) => p.toLowerCase().includes("nursingstats"));

  if (matched.length === 0) {
    console.log("未找到包含 NursingStats 的路径");
    console.log("\n尝试查找包含 Nursing 的路径:");
    const nursingPaths = paths.filter((p) =>
      p.toLowerCase().includes("nursing")
    );
    nursingPaths.forEach((p) => console.log(`  ${p}`));
  } else {
    console.log("找到以下路径:");
    matched.forEach((p) => {
      console.log(`  ${p}`);
      const methods = Object.keys(swaggerDoc.paths[p]);
      console.log(`    方法: ${methods.join(", ")}`);
    });
  }

  // 也输出所有 VillageNursing 相关的路径
  console.log("\n=== 所有 VillageNursing 相关路径 ===");
  const villagePaths = paths.filter((p) => p.includes("VillageNursing"));
  villagePaths.forEach((p) => console.log(`  ${p}`));
}

debug().catch(console.error);
