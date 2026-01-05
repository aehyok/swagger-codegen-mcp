/**
 * TypeScript API 代码生成器
 * 根据Swagger定义生成TypeScript代码
 */

import {
  resolveRef,
  swaggerTypeToTs,
  collectRequiredDefinitions,
} from "./swagger-parser.js";

/**
 * 将路径转换为驼峰命名的函数名
 * @param {string} path API路径
 * @param {string} method HTTP方法
 * @returns {string} 函数名
 */
function pathToFunctionName(path, method) {
  // 移除 /api/village/ 前缀
  let name = path.replace(/^\/api\/village\//, "").replace(/^\/api\//, "");

  // 替换路径参数 {id} -> ById
  name = name.replace(/\/{([^}]+)}/g, (_, param) => {
    return "By" + param.charAt(0).toUpperCase() + param.slice(1);
  });

  // 移除斜杠，转为驼峰
  const parts = name.split("/").filter(Boolean);
  const camelCase = parts
    .map((part, index) => {
      if (index === 0) {
        return part.charAt(0).toLowerCase() + part.slice(1);
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");

  // 添加方法前缀（如果需要区分）
  const methodPrefix = {
    GET: "get",
    POST: "create",
    PUT: "update",
    DELETE: "delete",
    PATCH: "patch",
  };

  // 如果函数名已经以方法相关词汇开头，不添加前缀
  const startsWithMethod =
    /^(get|post|put|delete|patch|create|update|add|remove|fetch|list|save)/i.test(
      camelCase
    );
  if (startsWithMethod) {
    return camelCase.charAt(0).toLowerCase() + camelCase.slice(1);
  }

  return camelCase.charAt(0).toLowerCase() + camelCase.slice(1);
}

/**
 * 生成参数接口名称
 * @param {string} funcName 函数名
 * @returns {string} 参数接口名
 */
function getParamsInterfaceName(funcName) {
  return funcName.charAt(0).toUpperCase() + funcName.slice(1) + "Params";
}

/**
 * 生成返回类型名称
 * @param {string} funcName 函数名
 * @returns {string} 返回类型名
 */
function getResponseTypeName(funcName) {
  return funcName.charAt(0).toUpperCase() + funcName.slice(1) + "Response";
}

/**
 * 生成接口定义的TypeScript代码
 * @param {object} swaggerDoc Swagger文档
 * @param {Set<string>} requiredDefs 需要的定义名称
 * @returns {string} TypeScript类型定义代码
 */
function generateTypeDefinitions(swaggerDoc, requiredDefs) {
  const definitions = swaggerDoc.definitions || {};
  const lines = [];
  const processed = new Set();

  function processDefinition(name) {
    if (processed.has(name) || !definitions[name]) return;
    processed.add(name);

    const def = definitions[name];

    // 先处理这个定义依赖的其他定义
    if (def.properties) {
      for (const prop of Object.values(def.properties)) {
        if (prop.$ref) {
          const refName = prop.$ref.split("/").pop();
          if (requiredDefs.has(refName)) {
            processDefinition(refName);
          }
        }
        if (prop.items && prop.items.$ref) {
          const refName = prop.items.$ref.split("/").pop();
          if (requiredDefs.has(refName)) {
            processDefinition(refName);
          }
        }
      }
    }

    // 生成这个定义
    lines.push(`/** ${def.description || name} */`);
    lines.push(`export interface ${name} {`);

    if (def.properties) {
      const required = def.required || [];
      for (const [propName, prop] of Object.entries(def.properties)) {
        const isRequired = required.includes(propName);
        const propType = swaggerTypeToTs(prop, swaggerDoc, new Set([name]));
        const description = prop.description ? ` // ${prop.description}` : "";
        lines.push(
          `  ${propName}${isRequired ? "" : "?"}: ${propType};${description}`
        );
      }
    }

    lines.push(`}`);
    lines.push("");
  }

  // 处理所有需要的定义
  for (const name of requiredDefs) {
    processDefinition(name);
  }

  return lines.join("\n");
}

/**
 * 生成单个接口的TypeScript代码
 * @param {object} endpoint 接口定义
 * @param {object} swaggerDoc Swagger文档
 * @returns {object} 包含函数代码和类型代码
 */
function generateEndpointCode(endpoint, swaggerDoc) {
  const funcName = pathToFunctionName(endpoint.path, endpoint.method);
  const paramsInterface = getParamsInterfaceName(funcName);

  // 分析参数
  const queryParams = [];
  const pathParams = [];
  const bodyParam = null;
  let hasBody = false;
  let bodyType = "any";
  let bodyRef = null;

  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      const paramType = param.type ? swaggerTypeToTs(param, swaggerDoc) : "any";
      const paramDef = {
        name: param.name,
        type: paramType,
        required: param.required || false,
        description: param.description || "",
        in: param.in,
      };

      if (param.in === "query") {
        queryParams.push(paramDef);
      } else if (param.in === "path") {
        pathParams.push(paramDef);
      } else if (param.in === "body") {
        hasBody = true;
        if (param.schema) {
          if (param.schema.$ref) {
            bodyRef = param.schema.$ref.split("/").pop();
            bodyType = bodyRef;
          } else {
            bodyType = swaggerTypeToTs(param.schema, swaggerDoc);
          }
        }
      }
    }
  }

  // 分析响应
  let responseType = "any";
  let responseRef = null;
  const successResponse =
    endpoint.responses["200"] || endpoint.responses["201"];
  if (successResponse && successResponse.schema) {
    if (successResponse.schema.$ref) {
      responseRef = successResponse.schema.$ref.split("/").pop();
      responseType = responseRef;
    } else if (
      successResponse.schema.type === "array" &&
      successResponse.schema.items
    ) {
      if (successResponse.schema.items.$ref) {
        responseRef = successResponse.schema.items.$ref.split("/").pop();
        responseType = `${responseRef}[]`;
      } else {
        responseType = swaggerTypeToTs(successResponse.schema, swaggerDoc);
      }
    } else {
      responseType = swaggerTypeToTs(successResponse.schema, swaggerDoc);
    }
  }

  // 生成参数接口
  const allParams = [...pathParams, ...queryParams];
  let paramsInterfaceCode = "";
  if (allParams.length > 0 || hasBody) {
    const paramLines = allParams.map((p) => {
      const desc = p.description ? ` // ${p.description}` : "";
      return `  ${p.name}${p.required ? "" : "?"}: ${p.type};${desc}`;
    });

    if (hasBody) {
      paramLines.push(`  data${hasBody ? "" : "?"}: ${bodyType}; // 请求体`);
    }

    paramsInterfaceCode = `/** ${
      endpoint.summary || funcName
    } 参数 */\nexport interface ${paramsInterface} {\n${paramLines.join(
      "\n"
    )}\n}\n`;
  }

  // 生成函数代码
  let funcParams = "";
  let requestOptions = [];

  // 处理路径参数替换
  let urlTemplate = endpoint.path;
  if (pathParams.length > 0) {
    for (const p of pathParams) {
      urlTemplate = urlTemplate.replace(`{${p.name}}`, `\${params.${p.name}}`);
    }
    urlTemplate = "`" + urlTemplate + "`";
  } else {
    urlTemplate = `'${endpoint.path}'`;
  }

  // 生成参数传递
  if (allParams.length > 0 || hasBody) {
    funcParams = `params: ${paramsInterface}`;

    if (queryParams.length > 0) {
      const queryParamNames = queryParams.map((p) => p.name).join(", ");
      requestOptions.push(`params: { ${queryParamNames} }`);
    }

    if (hasBody) {
      requestOptions.push(`data: params.data`);
    }
  }

  const method = endpoint.method.toLowerCase();
  requestOptions.unshift(`method: '${method}'`);

  const optionsStr =
    requestOptions.length > 0
      ? `, {\n    ${requestOptions.join(",\n    ")}\n  }`
      : "";

  const funcCode = `/** ${endpoint.summary || ""} */
export function ${funcName}(${funcParams}): Promise<${responseType}> {
  return request(${urlTemplate}${optionsStr});
}
`;

  return {
    funcName,
    funcCode,
    paramsInterfaceCode,
    responseType,
    bodyRef,
    responseRef,
  };
}

/**
 * 生成完整的API模块代码
 * @param {Array<object>} endpoints 接口列表
 * @param {object} swaggerDoc Swagger文档
 * @param {string} tagName 标签名称
 * @returns {object} 包含types和api两个文件的代码
 */
export function generateApiModule(endpoints, swaggerDoc, tagName) {
  // 收集所有需要的类型定义
  const requiredDefs = collectRequiredDefinitions(swaggerDoc, endpoints);

  // 生成类型定义代码
  const typeDefsCode = generateTypeDefinitions(swaggerDoc, requiredDefs);

  // 生成每个接口的代码
  const endpointCodes = endpoints.map((ep) =>
    generateEndpointCode(ep, swaggerDoc)
  );

  // 收集所有参数接口
  const paramsInterfaces = endpointCodes
    .map((c) => c.paramsInterfaceCode)
    .filter(Boolean)
    .join("\n");

  // 生成types文件
  const typesContent = `/**
 * ${tagName} API 类型定义
 * 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

${typeDefsCode}
${paramsInterfaces}`;

  // 生成api文件
  const apiImports = [];
  const allTypes = new Set();

  // 收集需要导入的类型
  endpointCodes.forEach((c) => {
    if (c.paramsInterfaceCode) {
      allTypes.add(getParamsInterfaceName(c.funcName));
    }
    if (c.responseRef) {
      allTypes.add(c.responseRef);
    }
    if (c.bodyRef) {
      allTypes.add(c.bodyRef);
    }
  });

  // 从 requiredDefs 中添加
  requiredDefs.forEach((d) => allTypes.add(d));

  const typeImportList = Array.from(allTypes).filter(Boolean);

  const apiContent = `/**
 * ${tagName} API 接口
 * 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

import request from '@/common/utils/request';
${
  typeImportList.length > 0
    ? `import type {\n  ${typeImportList.join(
        ",\n  "
      )}\n} from './${tagName.toLowerCase()}.types';`
    : ""
}

${endpointCodes.map((c) => c.funcCode).join("\n")}`;

  return {
    typesFileName: `${tagName.toLowerCase()}.types.ts`,
    typesContent,
    apiFileName: `${tagName.toLowerCase()}.ts`,
    apiContent,
  };
}

/**
 * 生成单个接口的代码（简化版本）
 * @param {object} endpoint 接口定义
 * @param {object} swaggerDoc Swagger文档
 * @returns {string} 完整的代码（包含类型和函数）
 */
export function generateSingleEndpointCode(endpoint, swaggerDoc) {
  const requiredDefs = collectRequiredDefinitions(swaggerDoc, [endpoint]);
  const typeDefsCode = generateTypeDefinitions(swaggerDoc, requiredDefs);
  const endpointCode = generateEndpointCode(endpoint, swaggerDoc);

  return `/**
 * ${endpoint.summary || endpoint.path} API
 * 自动生成，请勿手动修改
 * 生成时间: ${new Date().toISOString()}
 */

import request from '@/common/utils/request';

// ============ 类型定义 ============

${typeDefsCode}
${endpointCode.paramsInterfaceCode}
// ============ 接口函数 ============

${endpointCode.funcCode}`;
}
