/**
 * 测试 Swagger 配置功能
 * 验证路径匹配逻辑是否正确
 */

import {
  getSwaggerUrlByPath,
  getAllServices,
  getServiceNameFromPath,
  SWAGGER_SERVICES,
} from "../src/swagger-config.js";

console.log("=== 测试 Swagger 配置 ===\n");

// 测试 1: 列出所有服务
console.log("1. 所有可用服务:");
const services = getAllServices();
services.forEach((s) => console.log(`   - ${s.name}: ${s.url}`));

// 测试 2: 路径匹配测试
console.log("\n2. 路径匹配测试:");

const testPaths = [
  "/api/village/VillageNursing/GetNursingStats",
  "/api/basic/User/GetList",
  "/api/ffp/Project/Create",
  "/api/dynamic/Form/Submit",
  "/api/customform/Template/List",
  "/api/ncdp/Report/Generate",
  "/api/gis/Map/GetLayers",
  "/api/query/Data/Search",
  "/api/unknown/Test/Path", // 未知服务，应使用默认
  "/invalid/path", // 无效路径，应使用默认
  null, // 空值，应使用默认
];

testPaths.forEach((path) => {
  const serviceName = getServiceNameFromPath(path);
  const swaggerUrl = getSwaggerUrlByPath(path);
  const expectedService =
    serviceName && SWAGGER_SERVICES[serviceName]
      ? serviceName
      : "village (default)";
  console.log(`   ${path || "(null)"}`);
  console.log(`     -> 服务: ${expectedService}`);
  console.log(`     -> URL: ${swaggerUrl}`);
  console.log();
});

console.log("=== 测试完成 ===");
