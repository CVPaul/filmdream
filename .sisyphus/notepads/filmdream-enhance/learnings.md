# learnings.md — FilmDream 增强计划

## 项目约定（来自现有代码）

### 后端
- 数据库：LowDB，`server/db.js` 提供 `db`, `getNextId`, `findById`, `deleteById`
- 路由注册：`server/server.js` 中 `app.use('/api/xxx', xxxRouter)`
- 文件上传：multer 已在 images.js 中使用，可复用配置
- SSE 模式：参考 pipeline.js — 设置 `Content-Type: text/event-stream`，写 `data: [DONE]\n\n` 结束

### 前端
- Store：Zustand (`import { create } from 'zustand'`)
- API base：`const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'`
- 路由：React Router，在 `client/src/App.jsx` 注册
- 侧边栏导航：`client/src/components/Layout.jsx` 或类似文件
- 图标：lucide-react
- 样式：Tailwind CSS

### 现有可复用基础设施
- `server/agents/task-queue.js` — TaskQueue/Task 完整实现（勿重写）
- `server/agents/pipeline-state.js` — 状态持久化模式可参考
- `server/routes/pipeline.js` — SSE 推送模式可参考
- `client/src/pages/Pipeline.jsx` — 进度 UI 模式可参考
- `client/src/stores/pipelineStore.js` — SSE store 模式可参考

## [2026-03-03] Task: A1 — 通用 AI 任务管理后端 API

### 完成内容
- 新建 `server/routes/tasks.js`：6 个端点 CRUD（列表/创建/详情/取消/重试/统计）
- 修改 `server/db.js`：defaultData 加 `tasks: []`，nextId 加 `tasks: 1`，加兼容初始化
- 修改 `server/server.js`：import tasksRouter，注册 `app.use('/api/tasks', tasksRouter)`

### 关键细节
- `/api/tasks/stats` 端点必须在 `/:id` 之前注册（Express 路由顺序，防止 'stats' 被当成 id 参数）
- DELETE 取消任务而非物理删除（符合 AI 任务语义，status → cancelled）
- retry 端点仅允许 failed 状态任务，重试后 retryCount + 1

### 数据模型
```js
{ id, name, type, description, params, status, progress, result, error,
  createdAt, startedAt, completedAt, retryCount }
```

## [2026-03-03] Task: A2 — task-worker.js

### Completed
- Created server/agents/task-worker.js with polling + concurrency control
- Modified server/server.js: startWorker() called after initDatabase()

### Key Details
- Polls every 2s, max 3 concurrent, uses in-memory Set to track running tasks
- Handles cancelled tasks during execution (checks status before writing completed)
- Stubs for image_gen, prompt_polish, storyboard_gen

## [2026-03-03] Task: A3+A4 — Frontend Task Monitor

### Completed
- Created client/src/stores/taskStore.js (Zustand, 3s polling)
- Created client/src/pages/Tasks.jsx (task monitoring page with cards)
- Modified client/src/App.jsx: added /tasks route
- Modified client/src/components/Sidebar.jsx: added 任务监控 nav item with ListTodo icon
