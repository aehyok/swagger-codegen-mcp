/**
 * Swagger 文档解析器
 * 负责获取和解析Swagger JSON文档
 */

import fetch from "node-fetch";

/**
 * 从URL获取Swagger文档
 * @param {string} swaggerUrl Swagger JSON的URL
 * @returns {Promise<object>} 解析后的Swagger文档对象
 */
export async function fetchSwaggerDoc(swaggerUrl) {
  const response = await fetch(swaggerUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Swagger doc: ${response.status} ${response.statusText}`
    );
  }
  return await response.json();
}

/**
 * 获取所有API标签
 * @param {object} swaggerDoc Swagger文档对象
 * @returns {Array<{name: string, description: string}>} 标签列表
 */
export function getAllTags(swaggerDoc) {
  const tags = new Set();
  const paths = swaggerDoc.paths || {};

  for (const path of Object.values(paths)) {
    for (const method of Object.values(path)) {
      if (method.tags) {
        method.tags.forEach((tag) => tags.add(tag));
      }
    }
  }

  // 获取tag描述（如果有定义）
  const tagDefinitions = swaggerDoc.tags || [];
  const tagMap = {};
  tagDefinitions.forEach((t) => {
    tagMap[t.name] = t.description || "";
  });

  return Array.from(tags).map((name) => ({
    name,
    description: tagMap[name] || "",
  }));
}

/**
 * 获取指定标签的所有接口
 * @param {object} swaggerDoc Swagger文档对象
 * @param {string} tag 标签名称
 * @returns {Array<object>} 接口列表
 */
export function getEndpointsByTag(swaggerDoc, tag) {
  const endpoints = [];
  const paths = swaggerDoc.paths || {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (operation.tags && operation.tags.includes(tag)) {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId || "",
          summary: operation.summary || "",
          description: operation.description || "",
          parameters: operation.parameters || [],
          requestBody: operation.requestBody,
          responses: operation.responses || {},
        });
      }
    }
  }

  return endpoints;
}

/**
 * 获取单个接口的详细信息
 * @param {object} swaggerDoc Swagger文档对象
 * @param {string} targetPath 接口路径
 * @param {string} targetMethod 请求方法
 * @returns {object|null} 接口详情
 */
export function getEndpointDetail(swaggerDoc, targetPath, targetMethod) {
  const paths = swaggerDoc.paths || {};
  const methods = paths[targetPath];

  if (!methods) {
    return null;
  }

  const operation = methods[targetMethod.toLowerCase()];
  if (!operation) {
    return null;
  }

  return {
    path: targetPath,
    method: targetMethod.toUpperCase(),
    operationId: operation.operationId || "",
    summary: operation.summary || "",
    description: operation.description || "",
    tags: operation.tags || [],
    parameters: operation.parameters || [],
    requestBody: operation.requestBody,
    responses: operation.responses || {},
    consumes: operation.consumes || [],
    produces: operation.produces || [],
  };
}

/**
 * 解析$ref引用，获取定义
 * @param {object} swaggerDoc Swagger文档对象
 * @param {string} ref 引用路径，如 #/definitions/MyModel
 * @returns {object|null} 定义对象
 */
export function resolveRef(swaggerDoc, ref) {
  if (!ref || !ref.startsWith("#/")) {
    return null;
  }

  const parts = ref.replace("#/", "").split("/");
  let current = swaggerDoc;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return null;
    }
  }

  return current;
}

/**
 * 将Swagger类型转换为TypeScript类型
 * @param {object} schema 类型schema
 * @param {object} swaggerDoc Swagger文档对象
 * @param {Set} processedRefs 已处理的引用（防止循环引用）
 * @returns {string} TypeScript类型字符串
 */
export function swaggerTypeToTs(schema, swaggerDoc, processedRefs = new Set()) {
  if (!schema) return "any";

  // 处理$ref引用
  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();

    // 检测循环引用
    if (processedRefs.has(refName)) {
      return refName;
    }

    return refName;
  }

  // 处理基本类型
  switch (schema.type) {
    case "string":
      if (schema.format === "date-time" || schema.format === "date") {
        return "string"; // 日期时间作为字符串处理
      }
      if (schema.enum) {
        return schema.enum.map((v) => `'${v}'`).join(" | ");
      }
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      const itemType = swaggerTypeToTs(schema.items, swaggerDoc, processedRefs);
      return `${itemType}[]`;
    case "object":
      if (schema.properties) {
        const props = Object.entries(schema.properties).map(([key, prop]) => {
          const propType = swaggerTypeToTs(prop, swaggerDoc, processedRefs);
          const required = schema.required && schema.required.includes(key);
          return `  ${key}${required ? "" : "?"}: ${propType};`;
        });
        return `{\n${props.join("\n")}\n}`;
      }
      if (schema.additionalProperties) {
        const valueType = swaggerTypeToTs(
          schema.additionalProperties,
          swaggerDoc,
          processedRefs
        );
        return `Record<string, ${valueType}>`;
      }
      return "Record<string, any>";
    default:
      // 没有type但有$ref的情况已在上面处理
      return "any";
  }
}

/**
 * 获取所有需要的类型定义
 * @param {object} swaggerDoc Swagger文档对象
 * @param {Array<object>} endpoints 接口列表
 * @returns {Set<string>} 需要的类型定义名称集合
 */
export function collectRequiredDefinitions(swaggerDoc, endpoints) {
  const required = new Set();

  function collectFromSchema(schema) {
    if (!schema) return;

    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      if (!required.has(refName)) {
        required.add(refName);
        // 递归处理这个定义中的引用
        const def = resolveRef(swaggerDoc, schema.$ref);
        if (def) {
          collectFromSchema(def);
        }
      }
    }

    if (schema.items) {
      collectFromSchema(schema.items);
    }

    if (schema.properties) {
      Object.values(schema.properties).forEach((prop) =>
        collectFromSchema(prop)
      );
    }

    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      collectFromSchema(schema.additionalProperties);
    }
  }

  for (const endpoint of endpoints) {
    // 收集参数中的类型
    if (endpoint.parameters) {
      for (const param of endpoint.parameters) {
        if (param.schema) {
          collectFromSchema(param.schema);
        }
      }
    }

    // 收集响应中的类型
    if (endpoint.responses) {
      for (const response of Object.values(endpoint.responses)) {
        if (response.schema) {
          collectFromSchema(response.schema);
        }
      }
    }
  }

  return required;
}
