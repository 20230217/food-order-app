# Food Order App 后端 API 文档

本文档概述了 Food Order App 后端可用的 API 接口。

## 基础 URL

所有 API 接口的基础 URL 为 `http://localhost:3000` (或 `server.js` 中配置的端口)。

## 菜品管理 API

菜品管理 API 提供了用于管理菜品的接口。

### 接口列表

#### 1. 获取所有菜品

- **URL:** `/api/dishes`
- **方法:** `GET`
- **描述:** 获取所有可用菜品的列表。
- **响应:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Dishes retrieved successfully",
      "data": [
        {
          "id": 1,
          "name": "Spaghetti Carbonara",
          "description": "经典意大利面",
          "price": 12.99,
          "category_id": 1
        },
        // ... 更多菜品
      ]
    }
    ```

## LangChain.js CommonJS 兼容性与依赖

本项目使用 CommonJS 模块规范 (`require`/`module.exports`)。LangChain.js 库在 Node.js 环境下对 CommonJS 有良好的支持，可以通过 `require` 语句引入其模块。

### 所需 LangChain.js 依赖

以下是本项目中使用的主要 LangChain.js 相关依赖，已添加到 `package.json` 中：

-   `langchain`: LangChain 的核心库。
-   `@langchain/openai`: 用于集成 OpenAI 模型（例如 `gpt-4o`）。
-   `@langchain/core`: LangChain 的核心组件，提供了如 `StructuredTool`、`AIMessage`、`HumanMessage` 等基础类。
-   `@langchain/community`: 包含了社区贡献的工具和模型，例如一些特定的 LLM 封装或工具实现。

**注意：** 如果您在使用过程中遇到模块导入问题，请确保您的 Node.js 版本支持这些库，并且所有依赖都已通过 `npm install` 正确安装。

### OpenAI API Key 配置

为了使 Agent 正常工作，您需要设置 `OPENAI_API_KEY` 环境变量。请确保您的环境中已配置此变量，例如：

```bash
export OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
```
或者在 `.env` 文件中配置（如果项目使用了 `dotenv` 库）。



## Agent API

Agent API 提供了与智能点餐与菜品推荐助手进行交互的接口。

### Endpoints

#### 1. Chat with Agent

- **URL:** `/api/agent/chat`
- **方法:** `POST`
- **描述:** 与智能助手进行对话，获取菜品推荐、购物车管理等服务。
- **请求体 (JSON):**
  ```json
  {
    "userId": 1,
    "message": "我想吃低脂一点的，帮我推荐",
    "chatHistory": [ // 可选，用于维持对话上下文
      { "type": "human", "content": "你好" },
      { "type": "ai", "content": "您好！我是您的智能点餐助手，有什么可以帮您的吗？" }
    ]
  }
  ```
- **响应:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Agent chat successful",
      "data": {
        "reply": "AI 回复内容",
        "toolCalls": [] // 如果 Agent 调用了工具，这里会包含工具调用信息
      }
    }
    ```
  - `400 Bad Request` (错误请求):
    ```json
    {
      "success": false,
      "message": "userId and message are required",
      "error": {}
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
    {
      "success": false,
      "message": "Failed to chat with agent",
      "error": {
        "message": "Failed to chat with agent",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
    {
      "success": false,
      "message": "Failed to retrieve dishes",
      "error": {
        "message": "Failed to retrieve dishes",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```

#### 2. 根据 ID 获取菜品

- **URL:** `/api/dishes/:id`
- **方法:** `GET`
- **描述:** 根据菜品 ID 获取单个菜品。
- **参数:**
  - `id` (路径参数): 菜品的唯一标识符。
- **响应:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Dish with ID 1 retrieved successfully",
      "data": {
        "id": 1,
        "name": "Spaghetti Carbonara",
        "description": "经典意大利面",
        "price": 12.99,
        "category_id": 1
      }
    }
    ```
  - `404 Not Found` (未找到):
    ```json
    {
      "success": false,
      "message": "Dish with ID 999 not found",
      "error": {}
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
    {
      "success": false,
      "message": "Failed to retrieve dish with ID 1",
      "error": {
        "message": "Failed to retrieve dish with ID 1",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```

#### 3. 创建新菜品

- **URL:** `/api/dishes`
- **方法:** `POST`
- **描述:** 创建一个新的菜品。
- **请求体 (JSON):**
  ```json
  {
    "name": "披萨玛格丽特",
    "description": "经典番茄、马苏里拉和罗勒披萨",
    "price": 15.50,
    "category_id": 2
  }
  ```
- **响应:**
  - `201 Created` (已创建):
    ```json
    {
      "success": true,
      "message": "Dish created successfully",
      "data": {
        "id": 5, // 新创建菜品的 ID
        "name": "披萨玛格丽特",
        "description": "经典番茄、马苏里拉和罗勒披萨",
        "price": 15.50,
        "category_id": 2
      }
    }
    ```
  - `400 Bad Request` (错误请求):
    ```json
    {
      "success": false,
      "message": "Dish name and price are required",
      "error": {}
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
    {
      "success": false,
      "message": "Failed to create dish",
      "error": {
        "message": "Failed to create dish",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```

#### 4. 更新菜品

- **URL:** `/api/dishes/:id`
- **方法:** `PUT`
- **描述:** 根据菜品 ID 更新现有菜品。
- **参数:**
  - `id` (路径参数): 要更新菜品的唯一标识符。
- **请求体 (JSON):**
  ```json
  {
    "name": "披萨玛格丽特 (已更新)",
    "price": 16.00
  }
  ```
- **响应:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Dish with ID 5 updated successfully",
      "data": {}
    }
    ```
  - `404 Not Found` (未找到):
    ```json
    {
      "success": false,
      "message": "Dish with ID 999 not found or no changes made",
      "error": {}
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
      "success": false,
      "message": "Failed to update dish with ID 5",
      "error": {
        "message": "Failed to update dish with ID 5",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```

#### 5. 删除菜品

- **URL:** `/api/dishes/:id`
- **方法:** `DELETE`
- **描述:** 根据菜品 ID 删除菜品。
- **参数:**
  - `id` (路径参数): 要删除菜品的唯一标识符。
- **响应:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Dish with ID 5 deleted successfully",
      "data": {}
    }
    ```
  - `404 Not Found` (未找到):
    ```json
    {
      "success": false,
      "message": "Dish with ID 999 not found",
      "error": {}
    }
    ```
  - `500 Internal Server Error` (内部服务器错误):
    ```json
    {
      "success": false,
      "message": "Failed to delete dish with ID 5",
      "error": {
        "message": "Failed to delete dish with ID 5",
        "stack": "..." // 仅在开发环境显示
      }
    }
    ```
