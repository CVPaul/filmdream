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

## [2026-03-03] Task: B1+B2 — Text Import Feature

### Completed
- Created server/routes/import.js: /text /file /confirm endpoints
- Modified server/server.js: registered importRouter at /api/import
- Modified client/src/pages/Story.jsx: added 导入 button and modal

### Key Details
- parseText() handles 第X章, Chapter X, ## markdown headings
- Falls back to single chapter if no headings detected
- Modal: paste text → parse preview → confirm import
- multer uses memoryStorage (no disk writes for tmp files)

## [2026-03-03] Task: C1+C2 — Prompt Polisher Agent + API Route

### Completed
- Created server/agents/presets/prompt-polisher.js: JS config object (ESM default export)
- Created server/routes/promptPolish.js: POST /api/prompt-polish (SSE) + POST /api/prompt-polish/batch
- Modified server/server.js: import + register at /api/prompt-polish

### Key Details
- Existing presets in server/agents/presets/ are .md files (frontmatter + markdown body)
- prompt-polisher.js is a standalone JS config NOT loaded by the .md agent system — imported directly in route
- SSE pattern: set 4 headers → for await (const chunk of providerManager.chatStream(...)) → res.write('data: [DONE]\n\n') → res.end()
- Batch endpoint creates task in db.data.tasks with type='prompt_polish', status='pending' — worker picks up automatically
- characterIds lookup: db.data.characters.find(c => c.id === parseInt(id)) (ids are numbers in LowDB)
- sceneId lookup: db.data.scenes.find(s => s.id === parseInt(sceneId))
- Route registration: after line 86 (app.use('/api/import', importRouter))

## [2026-03-03] Task: C3 — AI润色 Button in ShotDetailPanel (Timeline.jsx)

### Completed
- Modified `client/src/pages/Timeline.jsx`:
  - Added `const API_BASE = '/api'` at top-level (line 14)
  - Added 4 state vars to ShotDetailPanel: `polishing`, `polishResult`, `polishError`, `showPolishPanel`
  - Added `handlePolish` async function with SSE streaming logic
  - Added `✨ AI润色` button (amber style, Sparkles icon, spinner during loading) after 生成 button
  - Added polish result panel (inline, amber theme, editable textarea) after existing prompt display

### Key Details
- API_BASE declared at module scope (not inside component) — consistent with other pages
- Polish result panel is a sibling div inside `div.space-y-4` view mode container, outside the `div.pt-4.border-t` section — valid JSX nesting
- SSE streaming: fetch POST → getReader → decode chunks → split by '\n\n' → parse 'data: {...}' → accumulate `.content`
- "采用" calls `onUpdate(shot.id, { generatedPrompt: polishResult })` then hides panel
- "放弃" clears `polishResult` and hides panel
- Babel parse confirmed: PARSE OK (acorn doesn't support JSX)
- `Sparkles` icon was already imported in line 6 — no new imports needed

## [2026-03-03] Task: D1+D2 — Storyboard Generator Agent + API Routes

### Completed
- Created `server/agents/presets/storyboard-generator.js`: ESM default export `{ name, description, systemPrompt, tools: [] }`
- Modified `server/routes/shots.js`:
  - Added imports: `providerManager` from `../providers/index.js`, `storyboardGeneratorAgent` from `../agents/presets/storyboard-generator.js`
  - Added `POST /generate` (non-streaming, returns preview JSON array, no DB write)
  - Added `POST /generate/confirm` (writes confirmed shots to db, returns created shots)

### Key Details
- `/generate` and `/generate/confirm` inserted BEFORE `GET /:id` (line ~159 in new file) — critical for Express param routing
- Non-streaming LLM call: `providerManager.chat({ provider, model, messages })` returns `{ content, ... }`
- JSON parsing: strip ```json code fences with regex `/```(?:json)?\s*([\s\S]*?)```/` before `JSON.parse()`
- On JSON parse failure: return `{ success: false, error: 'Invalid JSON from LLM', raw: response.content }`
- `/generate/confirm` uses `shots.forEach((shot, idx) => ...)` with `maxOrder + idx + 1` for orderIndex sequence
- storyboard-generator systemPrompt: Chinese instructions, specifies exact shotType/cameraMovement enum values, outputs pure JSON array
- `node --check` passes on both files (ESM syntax valid)

## [2026-03-03] Task: D3 — AI生成分镜 UI in Scenes.jsx

### Completed
- Added `Film` icon to existing lucide-react import
- Added `const API_BASE = '/api'` at module scope (line 10)
- Added 7 new state variables: showGenerateModal, generating, generateCount, generateStyle, previewShots, generateError, generateSuccess
- Added handler functions: handleOpenGenerateModal, handleCloseGenerateModal, handleGeneratePreview, handleConfirmGenerate, handleUpdatePreviewShot
- Inserted "AI分镜生成" card block after "场景角色" card (visible when scene selected)
- Inserted full generate modal after 角色选择器 modal

### Key Details
- Modal uses fixed inset-0 bg-black/60 backdrop overlay
- generatePreview calls POST /api/shots/generate with { sceneId, count, style }
- confirm calls POST /api/shots/generate/confirm with { sceneId, shots }
- Both use regular fetch + await res.json() (no SSE/streaming)
- Preview shots are inline-editable (description, shotType, cameraMovement)
- "确认生成" button disabled when no previewShots or generating
- Success auto-closes modal after 1500ms via setTimeout
- Error/success shown as colored banners inside modal
- Build passes clean: ✓ built in 4.69s (no errors)
