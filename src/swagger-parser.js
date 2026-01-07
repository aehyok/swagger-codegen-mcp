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
  let methods = paths[targetPath];
  let actualPath = targetPath;

  // 如果精确匹配失败，尝试模糊匹配（处理路径参数的情况）
  if (!methods) {
    // 查找以 targetPath 开头的路径（可能后面有 /{id} 等参数）
    const matchedPath = Object.keys(paths).find((p) => {
      // 精确前缀匹配：路径以 targetPath 开头，后面跟着 /{xxx} 或结束
      if (p.startsWith(targetPath)) {
        const remaining = p.slice(targetPath.length);
        // 剩余部分为空，或者是 /{参数} 的形式
        return remaining === "" || remaining.match(/^\/\{[^}]+\}$/);
      }
      return false;
    });

    if (matchedPath) {
      methods = paths[matchedPath];
      actualPath = matchedPath;
    }
  }

  if (!methods) {
    return null;
  }

  const operation = methods[targetMethod.toLowerCase()];
  if (!operation) {
    return null;
  }

  return {
    path: actualPath,
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
 * 递归解析接口中所有引用的模型，返回完整的模型定义
 * @param {object} swaggerDoc Swagger文档对象
 * @param {object} endpoint 接口详情对象
 * @returns {object} 关联的模型定义 { modelName: modelDefinition, ... }
 */
export function resolveAllRefsForEndpoint(swaggerDoc, endpoint) {
  const models = {};
  const collected = new Set();

  function collectFromSchema(schema) {
    if (!schema || typeof schema !== "object") return;

    // 处理 $ref 引用
    if (schema.$ref) {
      const refName = schema.$ref.split("/").pop();
      if (!collected.has(refName)) {
        collected.add(refName);
        const definition = resolveRef(swaggerDoc, schema.$ref);
        if (definition) {
          models[refName] = definition;
          // 递归处理这个定义中的嵌套引用
          collectFromSchema(definition);
        }
      }
      return;
    }

    // 处理数组类型
    if (schema.items) {
      collectFromSchema(schema.items);
    }

    // 处理对象属性
    if (schema.properties) {
      Object.values(schema.properties).forEach((prop) =>
        collectFromSchema(prop)
      );
    }

    // 处理 additionalProperties
    if (
      schema.additionalProperties &&
      typeof schema.additionalProperties === "object"
    ) {
      collectFromSchema(schema.additionalProperties);
    }

    // 处理 allOf / oneOf / anyOf
    ["allOf", "oneOf", "anyOf"].forEach((key) => {
      if (schema[key] && Array.isArray(schema[key])) {
        schema[key].forEach((item) => collectFromSchema(item));
      }
    });
  }

  // 从参数中收集
  if (endpoint.parameters) {
    for (const param of endpoint.parameters) {
      if (param.schema) {
        collectFromSchema(param.schema);
      }
    }
  }

  // 从请求体中收集 (OpenAPI 3.x)
  if (endpoint.requestBody?.content) {
    Object.values(endpoint.requestBody.content).forEach((mediaType) => {
      if (mediaType.schema) {
        collectFromSchema(mediaType.schema);
      }
    });
  }

  // 从响应中收集
  if (endpoint.responses) {
    for (const response of Object.values(endpoint.responses)) {
      // Swagger 2.x 格式
      if (response.schema) {
        collectFromSchema(response.schema);
      }
      // OpenAPI 3.x 格式
      if (response.content) {
        Object.values(response.content).forEach((mediaType) => {
          if (mediaType.schema) {
            collectFromSchema(mediaType.schema);
          }
        });
      }
    }
  }

  return models;
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
