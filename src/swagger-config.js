/**
 * Swagger API 端点配置
 *
 * 所有服务的 Swagger JSON URL 配置
 */

// API 基础 URL
const API_BASE_URL = "https://dvs-dev2.utuapp.cn/api";

// 服务端点映射
const SWAGGER_SERVICES = {
  village: `${API_BASE_URL}/village/swagger.json`,
  basic: `${API_BASE_URL}/basic/swagger.json`,
  ffp: `${API_BASE_URL}/ffp/swagger.json`,
  dynamic: `${API_BASE_URL}/dynamic/swagger.json`,
  customform: `${API_BASE_URL}/customform/swagger.json`,
  ncdp: `${API_BASE_URL}/ncdp/swagger.json`,
  gis: `${API_BASE_URL}/gis/swagger.json`,
  query: `${API_BASE_URL}/query/swagger.json`,
};

// 默认服务
const DEFAULT_SERVICE = "village";

/**
 * 根据 API 路径获取对应的 Swagger URL
 * @param {string} apiPath API 路径，如 "/api/village/VillageNursing/GetNursingStats"
 * @returns {string} 对应的 Swagger JSON URL
 */
function getSwaggerUrlByPath(apiPath) {
  if (!apiPath) {
    return SWAGGER_SERVICES[DEFAULT_SERVICE];
  }

  // 从路径中提取服务名
  // 匹配 /api/{serviceName}/... 格式
  const match = apiPath.match(/^\/api\/([^\/]+)\//i);

  if (match) {
    const serviceName = match[1].toLowerCase();
    if (SWAGGER_SERVICES[serviceName]) {
      return SWAGGER_SERVICES[serviceName];
    }
  }

  // 返回默认服务 URL
  return SWAGGER_SERVICES[DEFAULT_SERVICE];
}

/**
 * 获取所有可用的服务列表
 * @returns {Array<{name: string, url: string}>}
 */
function getAllServices() {
  return Object.entries(SWAGGER_SERVICES).map(([name, url]) => ({
    name,
    url,
  }));
}

/**
 * 从 API 路径中提取服务名
 * @param {string} apiPath API 路径
 * @returns {string|null} 服务名或 null
 */
function getServiceNameFromPath(apiPath) {
  if (!apiPath) return null;

  const match = apiPath.match(/^\/api\/([^\/]+)\//i);
  return match ? match[1].toLowerCase() : null;
}

export {
  API_BASE_URL,
  SWAGGER_SERVICES,
  DEFAULT_SERVICE,
  getSwaggerUrlByPath,
  getAllServices,
  getServiceNameFromPath,
};
