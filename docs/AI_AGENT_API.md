# FilmDream AI Agent API

这个 API 允许 LLM（如 GPT-4、Claude）直接调用 FilmDream 的所有功能，实现自动化电影创作。

## LLM Provider 系统

FilmDream 支持通过 GitHub Copilot 订阅访问多家 LLM 模型（Claude、GPT-4、Gemini 等），实现智能对话和自动化工作流。

### 支持的模型
- **Claude Sonnet 4** - 平衡速度与能力
- **Claude Opus 4** - 最强大的 Claude 模型（需要 Pro+）
- **Claude 3.5 Haiku** - 快速响应
- **GPT-4o / GPT-4o Mini** - OpenAI 多模态模型
- **o1 / o1-mini / o3-mini** - OpenAI 推理模型
- **Gemini 2.0 Flash** - Google 快速模型

### LLM API 端点

#### 1. Provider 管理

```bash
# 获取可用 Provider 列表
GET /api/llm/providers

# 获取已配置的模型列表
GET /api/llm/models

# 更新默认 Provider/Model
PUT /api/llm/config
```

#### 2. OAuth 认证（GitHub Device Flow）

```bash
# 开始认证
POST /api/llm/auth/start
{
  "provider": "github-copilot"
}

# 轮询认证状态
POST /api/llm/auth/poll
{
  "provider": "github-copilot",
  "deviceCode": "xxx"
}

# 登出
DELETE /api/llm/auth/:provider
```

#### 3. 聊天请求

```bash
# 简单聊天（非流式）
POST /api/llm/chat
{
  "messages": [{"role": "user", "content": "你好"}],
  "useAgentTools": true
}

# 流式聊天（SSE）
POST /api/llm/chat/stream

# 完整对话循环（自动执行工具调用）
POST /api/llm/chat/complete
{
  "messages": [{"role": "user", "content": "创建一个机甲角色"}],
  "maxIterations": 10
}

# 流式完整对话循环
POST /api/llm/chat/complete/stream
```

#### 4. 工具管理

```bash
# 获取所有 Agent Tools（Function Calling 格式）
GET /api/llm/tools

# 获取默认系统提示词
GET /api/llm/system-prompt
```

---

## 快速开始

### 1. 获取所有可用的 Actions（OpenAI Function Calling 格式）

```bash
curl http://localhost:3001/api/agent/actions
```

响应示例：
```json
{
  "version": "1.0.0",
  "description": "FilmDream Studio AI Agent API",
  "total_actions": 42,
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_shot",
        "description": "创建新的分镜/镜头",
        "parameters": { ... }
      }
    }
  ]
}
```

### 2. 执行单个 Action

```bash
curl -X POST http://localhost:3001/api/agent/execute \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_character",
    "parameters": {
      "name": "铁甲战神",
      "type": "mech",
      "description": "高达50米的巨型机甲，配备双肩粒子炮",
      "appearance": "银灰色装甲，红色发光眼睛，胸口有蓝色能量核心"
    }
  }'
```

### 3. 批量执行多个 Actions

```bash
curl -X POST http://localhost:3001/api/agent/batch \
  -H "Content-Type: application/json" \
  -d '{
    "actions": [
      {
        "action": "create_scene",
        "parameters": {
          "name": "城市战斗",
          "description": "机甲与怪兽在东京市中心激战",
          "location": "东京新宿区",
          "timeOfDay": "dusk",
          "weather": "storm"
        }
      },
      {
        "action": "create_shot",
        "parameters": {
          "description": "机甲从云层中降落，尘土飞扬",
          "duration": 5,
          "shotType": "low_angle",
          "cameraMovement": "tilt"
        }
      }
    ]
  }'
```

### 4. OpenAI Function Calling 集成

```bash
curl -X POST http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "tool_calls": [
      {
        "id": "call_abc123",
        "function": {
          "name": "list_characters",
          "arguments": "{\"type\": \"mech\"}"
        }
      }
    ]
  }'
```

---

## 完整 Actions 列表

### 项目概览
| Action | 描述 |
|--------|------|
| `get_project_stats` | 获取项目统计数据 |

### 图片管理
| Action | 描述 |
|--------|------|
| `list_images` | 列出所有图片 |
| `get_image` | 获取单张图片 |
| `update_image` | 更新图片信息 |

### 角色管理
| Action | 描述 |
|--------|------|
| `list_characters` | 列出所有角色 |
| `get_character` | 获取角色详情 |
| `create_character` | 创建新角色 |
| `update_character` | 更新角色 |
| `delete_character` | 删除角色 |

### 场景管理
| Action | 描述 |
|--------|------|
| `list_scenes` | 列出所有场景 |
| `get_scene` | 获取场景详情 |
| `create_scene` | 创建新场景 |
| `update_scene` | 更新场景 |
| `add_character_to_scene` | 添加角色到场景 |

### 场景流程图
| Action | 描述 |
|--------|------|
| `get_scene_flow` | 获取完整的场景流程图数据（节点+连接） |
| `create_scene_connection` | 创建场景之间的连接（表示流转关系） |
| `update_scene_connection` | 更新连接属性（转场类型、条件等） |
| `delete_scene_connection` | 删除场景连接 |
| `get_scene_connections` | 获取指定场景的入边和出边 |
| `auto_layout_scene_flow` | 自动计算流程图布局 |
| `update_scene_position` | 更新场景在流程图中的位置 |

### 分镜/镜头管理
| Action | 描述 |
|--------|------|
| `list_shots` | 列出所有镜头 |
| `get_shot` | 获取镜头详情 |
| `create_shot` | 创建新镜头 |
| `update_shot` | 更新镜头 |
| `delete_shot` | 删除镜头 |
| `reorder_shots` | 重新排序镜头 |
| `add_character_to_shot` | 添加角色到镜头 |

### 技巧库
| Action | 描述 |
|--------|------|
| `list_techniques` | 列出所有拍摄技巧 |
| `get_technique` | 获取技巧详情 |
| `apply_technique_to_shot` | 应用技巧到镜头 |

### 提示词生成
| Action | 描述 |
|--------|------|
| `generate_shot_prompt` | 为镜头生成 AI 提示词 |
| `generate_scene_prompt` | 为场景生成 AI 提示词 |

### 配音管理
| Action | 描述 |
|--------|------|
| `list_voiceovers` | 列出配音台词 |
| `create_voiceover` | 创建配音台词 |

### 故事/剧本
| Action | 描述 |
|--------|------|
| `list_story_chapters` | 列出故事章节 |
| `create_story_chapter` | 创建故事章节 |
| `update_story_chapter` | 更新故事章节 |

### 导出功能
| Action | 描述 |
|--------|------|
| `export_timeline` | 导出分镜时间线 |
| `export_comfyui_workflow` | 导出 ComfyUI 工作流 |

### 批量操作
| Action | 描述 |
|--------|------|
| `batch_create_shots` | 批量创建镜头 |
| `batch_apply_techniques` | 批量应用技巧 |

---

## 使用场景示例

### 示例 1：自动创建完整的战斗场景

```javascript
// 用自然语言描述给 LLM，让它调用以下 Actions：

// 1. 创建场景
await execute('create_scene', {
  name: '新宿决战',
  description: '巨型机甲与三头怪兽在新宿高楼群中激战',
  location: '东京新宿区',
  timeOfDay: 'dusk',
  weather: 'storm',
  mood: 'intense'
})

// 2. 创建角色
await execute('create_character', {
  name: '铁甲战神',
  type: 'mech',
  height: '50米',
  appearance: '银灰色装甲，红色双眼',
  abilities: '粒子炮、能量剑、飞行推进器'
})

await execute('create_character', {
  name: '三头蛇龙',
  type: 'monster',
  height: '80米',
  appearance: '黑色鳞片，三个龙头，翅膀',
  abilities: '吐火、毒雾、尾巴横扫'
})

// 3. 批量创建分镜
await execute('batch_create_shots', {
  shots: [
    {
      description: '城市全景，远处怪兽咆哮，人群惊恐逃散',
      duration: 4,
      shotType: 'extreme_wide',
      cameraMovement: 'static'
    },
    {
      description: '机甲从天而降，脚踏在马路上激起尘土',
      duration: 3,
      shotType: 'low_angle',
      cameraMovement: 'tilt'
    },
    {
      description: '写字楼内部，员工透过玻璃窗看到战斗',
      duration: 2,
      shotType: 'over_shoulder',
      cameraMovement: 'dolly_in'
    }
  ]
})

// 4. 为所有镜头生成提示词
const shots = await execute('list_shots', {})
for (const shot of shots) {
  await execute('generate_shot_prompt', {
    shotId: shot.id,
    style: 'cinematic',
    includeCharacters: true,
    includeTechniques: true
  })
}

// 5. 导出 ComfyUI 工作流
await execute('export_comfyui_workflow', {
  shotIds: shots.map(s => s.id),
  template: 'cogvideox',
  resolution: '720x480'
})
```

### 示例 2：LLM System Prompt

```
你是一个专业的科幻电影分镜师 AI。你可以调用以下工具来帮助用户创建电影：

[这里插入 /api/agent/actions 返回的 tools 数组]

用户可以用自然语言描述他们想要的场景，你需要：
1. 理解用户意图
2. 调用相应的 Actions 创建内容
3. 为每个镜头生成高质量的 AI 提示词
4. 最后导出可用于视频生成的工作流

记住：
- 机甲战斗场景要注重规模感（低角度仰拍）
- 城市破坏要有层次（前景人物、中景废墟、远景巨物）
- 运镜要配合情绪（紧张用手持、震撼用静止特写）
```

---

## 与 OpenAI API 集成

```python
import openai
import requests

# 1. 获取 FilmDream 的 tools 定义
tools_response = requests.get('http://localhost:3001/api/agent/actions')
tools = tools_response.json()['tools']

# 2. 发送给 OpenAI
response = openai.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "你是科幻电影分镜师..."},
        {"role": "user", "content": "创建一个机甲降落在城市的震撼场景"}
    ],
    tools=tools
)

# 3. 执行返回的 tool_calls
if response.choices[0].message.tool_calls:
    tool_results = requests.post(
        'http://localhost:3001/api/agent/chat',
        json={'tool_calls': [
            {
                'id': tc.id,
                'function': {
                    'name': tc.function.name,
                    'arguments': tc.function.arguments
                }
            }
            for tc in response.choices[0].message.tool_calls
        ]}
    )
    print(tool_results.json())
```

---

## 注意事项

1. **数据持久化**：所有数据存储在 `server/data/db.json`
2. **图片上传**：图片上传需要通过 `/api/images` 的标准 multipart 接口
3. **并发限制**：批量操作建议每批不超过 50 个
4. **提示词质量**：生成的提示词基于场景、角色、技巧信息，信息越完整质量越高
