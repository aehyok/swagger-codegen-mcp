/**
 * 查找 GetNursingStats 接口的返回模型定义
 */

import fetch from "node-fetch";

const SWAGGER_URL = "https://dvs-dev2.utuapp.cn/api/village/swagger.json";
const TARGET_PATH = "/api/village/VillageNursing/GetNursingStats";

async function findModel() {
  console.log("正在获取 Swagger 文档...");

  const response = await fetch(SWAGGER_URL);
  const swaggerDoc = await response.json();

  console.log("\n=== 1. 查找接口定义 ===");

  // 查找目标接口
  const pathDef = swaggerDoc.paths?.[TARGET_PATH];
  if (!pathDef) {
    // 尝试模糊匹配
    console.log("未找到精确路径，尝试模糊匹配...");
    const matchedPaths = Object.keys(swaggerDoc.paths || {}).filter((p) =>
      p.toLowerCase().includes("nursingstats")
    );
    console.log("匹配到的路径:", matchedPaths);
    return;
  }

  console.log("找到接口定义:");
  console.log(JSON.stringify(pathDef, null, 2));

  // 提取所有引用的模型
  console.log("\n=== 2. 提取引用的模型 ($ref) ===");
  const refs = new Set();

  function extractRefs(obj) {
    if (!obj || typeof obj !== "object") return;
    if (obj.$ref) {
      refs.add(obj.$ref);
    }
    for (const value of Object.values(obj)) {
      extractRefs(value);
    }
  }

  extractRefs(pathDef);
  console.log("发现的引用:", [...refs]);

  // 查找并打印每个引用的模型定义
  console.log("\n=== 3. 模型定义详情 ===");
  for (const ref of refs) {
    const parts = ref.replace("#/", "").split("/");
    let definition = swaggerDoc;
    for (const part of parts) {
      definition = definition?.[part];
    }

    if (definition) {
      console.log(`\n--- ${ref} ---`);
      console.log(JSON.stringify(definition, null, 2));

      // 递归查找嵌套引用
      const nestedRefs = new Set();
      extractRefs(definition);

      // 只处理新发现的引用
      for (const nestedRef of refs) {
        if (!refs.has(nestedRef)) {
          nestedRefs.add(nestedRef);
        }
      }
    } else {
      console.log(`\n--- ${ref} --- 未找到定义!`);
    }
  }
}

findModel().catch(console.error);
