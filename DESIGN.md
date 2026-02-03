# 🎬 FilmDream Studio - 设计文档

> 科幻电影创作辅助工具 - 从AI图片到视频制作的全流程管理平台

---

## 📋 项目概述

**FilmDream Studio** 是一个本地运行的Web应用，专为科幻电影创作设计。从AI生成的机甲/怪兽图片管理，到故事编写、场景规划、分镜设计，再到ComfyUI视频生成工作流导出，提供全流程支持。

### 核心价值

- **图片-故事一致性**：确保视频画面与故事剧情保持一致
- **自动化提示词生成**：基于角色档案+场景+动作自动生成ComfyUI提示词
- **新手友好**：内置剪辑技巧库帮助没经验的人快速上手

### 使用场景

- 个人使用
- 本地存储数据
- 多AI平台图片混用（手动上传）
- 视频生成面向ComfyUI工作流

---

## 🏗️ 功能模块

```
┌─────────────────────────────────────────────────────────────────┐
│                     🎬 FilmDream Studio                          │
├─────────┬─────────┬─────────┬─────────┬─────────┬───────────────┤
│  📸     │  👾     │  📖     │  🎭     │  🎬     │  🎥           │
│ 图片库   │ 角色    │ 故事    │ 场景    │ 分镜    │ 镜头构图       │
│         │ 档案    │ 编辑    │ 规划    │ 时间线  │               │
├─────────┴─────────┴─────────┴─────────┴─────────┴───────────────┤
│       🎓 剪辑技巧库        │       🤖 ComfyUI工作流生成器        │
└────────────────────────────┴────────────────────────────────────┘
```

### 1️⃣ 图片资产库 (Gallery)

| 功能 | 说明 |
|------|------|
| 批量上传 | 拖拽/选择多图上传 |
| 智能分类 | 机甲/怪兽/场景/道具/特效 |
| 多视图标记 | 为同一角色标记正面/侧面/背面/细节图 |
| 状态管理 | 待定/已采用/废弃 |
| 图片比较 | 并排对比多张图片选择最佳 |

### 2️⃣ 角色档案系统 (Characters)

| 功能 | 说明 |
|------|------|
| 档案卡片 | 名称、类型、尺寸、能力、弱点、背景故事 |
| 多视图图库 | 关联角色的所有参考图（按视角/动作分类） |
| 提示词模板 | 该角色的固定描述词（确保一致性） |
| 关系图谱 | 角色之间的关系（敌对/盟友/从属） |

### 3️⃣ 故事编辑器 (Story)

| 功能 | 说明 |
|------|------|
| 富文本编辑 | 支持Markdown，分章节管理 |
| 角色引用 | @提及角色，自动链接档案 |
| 关键词提取 | AI辅助提取场景/动作关键词 |
| 版本历史 | 保存历史版本，可回滚 |

### 4️⃣ 场景规划板 (Scenes)

| 功能 | 说明 |
|------|------|
| 场景卡片 | 名称、环境描述、氛围设定 |
| 角色编排 | 拖入场景的角色，标记位置 |
| 背景图库 | 关联场景的环境参考图 |
| 场景流程图 | 场景之间的转换关系 |

### 5️⃣ 分镜时间线 (Timeline) ⭐核心

| 功能 | 说明 |
|------|------|
| 可视化时间线 | 拖拽排序镜头 |
| 镜头卡片 | 场景+角色+动作+台词+时长 |
| 提示词生成器 | 根据镜头信息自动生成ComfyUI提示词 |
| 参数预设 | 预设不同风格的生成参数 |
| 分镜导出 | PDF/Markdown格式导出 |

### 6️⃣ 镜头构图器 (Compositor) ⭐新增

用于复杂镜头的多层次构图规划，特别适合城市战斗等大场面。

| 功能 | 说明 |
|------|------|
| 层次画布 | 可视化管理前景/中景/背景，拖入不同元素 |
| 比例尺参考 | 设定机甲/怪兽的绝对高度，自动计算不同距离的相对大小 |
| POV标记 | 标注摄像机位置（楼层高度、室内/室外、角度） |
| 环境氛围库 | 预设城市战斗的常见氛围（烟尘、火光、碎片、逃跑人群） |
| 透视辅助线 | 帮助保持多个镜头的透视一致 |
| 元素复用 | 同一场战斗的不同镜头可共享背景设定 |

**构图器示例：**
```
┌─────────────────────────────────────────────────┐
│  镜头 #23: 写字楼望向战斗                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────┐  ┌───────────────┐  ┌──────────────┐  │
│  │前景 │  │   中景        │  │   背景       │  │
│  ├─────┤  ├───────────────┤  ├──────────────┤  │
│  │办公室│  │  城市街道     │  │ 机甲vs怪兽   │  │
│  │窗框 │  │  其他建筑     │  │ 战斗爆炸    │  │
│  │人影 │  │  飞溅碎片     │  │              │  │
│  └─────┘  └───────────────┘  └──────────────┘  │
│                                                 │
│  📐 透视参考: [POV from window, 30th floor]     │
│  🌅 氛围: 黄昏, 火光映照, 烟尘弥漫              │
│  📷 镜头类型: 静态/缓慢推进                      │
│                                                 │
│  [生成ComfyUI提示词]                            │
└─────────────────────────────────────────────────┘
```

### 7️⃣ 剪辑技巧库 (Techniques) 🎓

| 功能 | 说明 |
|------|------|
| 镜头语言 | 推镜、拉镜、摇镜、跟镜等解释+示例 |
| 转场技巧 | 淡入淡出、切换、叠化等效果说明 |
| 剪辑节奏 | 动作戏/对话戏/情绪戏的剪辑建议 |
| 科幻特效 | 常用科幻元素的实现建议 |
| 模板库 | 预设的镜头组合模板可直接使用 |
| 与分镜联动 | 在创建镜头时可选择推荐技巧 |

### 8️⃣ ComfyUI工作流集成 🤖

| 功能 | 说明 |
|------|------|
| 提示词模板 | 基于角色档案+场景+动作生成 |
| 参数配置 | 采样器、步数、CFG等预设 |
| 工作流导出 | 导出JSON可直接导入ComfyUI |
| 批量生成队列 | 生成所有镜头的任务列表 |

---

## 🔧 技术方案

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18 + Vite | 现代化开发，快速热更新 |
| UI框架 | Tailwind CSS | 快速构建简约现代风格 |
| 拖拽 | @dnd-kit | 时间线拖拽排序 |
| 富文本 | TipTap | 故事编辑器 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 路由 | React Router v6 | 页面路由 |
| 后端 | Node.js + Express | 轻量API服务 |
| 数据库 | SQLite + better-sqlite3 | 本地持久化存储 |
| 图片存储 | 本地文件夹 | uploads/ 目录管理 |

---

## 📁 项目结构

```
📁 filmdream-studio/
├── 📁 client/                     # React前端
│   ├── 📁 public/
│   ├── 📁 src/
│   │   ├── 📁 components/         # 通用组件
│   │   │   ├── Layout.jsx         # 布局
│   │   │   ├── Sidebar.jsx        # 侧边导航
│   │   │   ├── ImageUploader.jsx  # 图片上传
│   │   │   ├── CharacterCard.jsx  # 角色卡片
│   │   │   ├── ShotCard.jsx       # 镜头卡片
│   │   │   └── ...
│   │   ├── 📁 pages/              # 页面
│   │   │   ├── Dashboard.jsx      # 仪表盘首页
│   │   │   ├── Gallery.jsx        # 图片资产库
│   │   │   ├── Characters.jsx     # 角色档案
│   │   │   ├── Story.jsx          # 故事编辑器
│   │   │   ├── Scenes.jsx         # 场景规划
│   │   │   ├── Timeline.jsx       # 分镜时间线
│   │   │   ├── Compositor.jsx     # 镜头构图器
│   │   │   ├── Techniques.jsx     # 剪辑技巧库
│   │   │   └── ComfyExport.jsx    # ComfyUI导出
│   │   ├── 📁 stores/             # 状态管理 (Zustand)
│   │   ├── 📁 hooks/              # 自定义Hooks
│   │   ├── 📁 utils/              # 工具函数
│   │   ├── 📁 data/               # 静态数据
│   │   │   ├── techniques.json    # 剪辑技巧库
│   │   │   ├── city-battle.json   # 城市战斗素材
│   │   │   └── prompts.json       # 提示词模板
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
│
├── 📁 server/                     # Node.js后端
│   ├── 📁 routes/
│   │   ├── images.js              # 图片API
│   │   ├── characters.js          # 角色API
│   │   ├── story.js               # 故事API
│   │   ├── scenes.js              # 场景API
│   │   ├── shots.js               # 镜头API
│   │   └── comfyui.js             # ComfyUI工作流
│   ├── 📁 templates/
│   │   └── comfyui-workflows/     # ComfyUI模板
│   ├── 📁 data/                   # SQLite数据库
│   ├── 📁 uploads/                # 上传的图片
│   ├── db.js                      # 数据库初始化
│   └── server.js                  # 入口文件
│
├── package.json                   # 根配置
├── DESIGN.md                      # 本文档
└── README.md                      # 使用说明
```

---

## 📊 数据模型

### ER图

```
┌──────────┐    ┌──────────┐    ┌──────────┐
│  Image   │───▶│ Character│───▶│  Scene   │
│  图片    │    │  角色    │    │  场景    │
└──────────┘    └──────────┘    └──────────┘
                     │               │
                     ▼               ▼
               ┌──────────┐    ┌──────────┐
               │  Story   │    │   Shot   │
               │  故事    │◀───│  镜头    │
               └──────────┘    └──────────┘
                                    │
                                    ▼
                             ┌────────────┐
                             │ Compositor │
                             │ 构图数据   │
                             └────────────┘
```

### 数据表设计

#### images 图片表
```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT,
  category TEXT DEFAULT 'uncategorized', -- mecha/monster/scene/prop/effect
  view_type TEXT, -- front/side/back/detail/action
  status TEXT DEFAULT 'pending', -- pending/adopted/rejected
  tags TEXT, -- JSON array
  character_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

#### characters 角色表
```sql
CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- mecha/monster/human
  height TEXT,
  abilities TEXT, -- JSON array
  weaknesses TEXT,
  backstory TEXT,
  prompt_template TEXT, -- 用于生成的固定提示词
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### scenes 场景表
```sql
CREATE TABLE scenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT,
  atmosphere TEXT, -- 氛围描述
  time_of_day TEXT,
  weather TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### scene_characters 场景-角色关联表
```sql
CREATE TABLE scene_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  position TEXT, -- JSON {x, y}
  role TEXT, -- 在场景中的角色
  FOREIGN KEY (scene_id) REFERENCES scenes(id),
  FOREIGN KEY (character_id) REFERENCES characters(id)
);
```

#### story 故事表
```sql
CREATE TABLE story (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT, -- 富文本内容
  chapter INTEGER DEFAULT 1,
  version INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### shots 镜头表
```sql
CREATE TABLE shots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scene_id INTEGER,
  order_index INTEGER NOT NULL,
  description TEXT,
  duration REAL, -- 秒
  shot_type TEXT, -- wide/medium/close-up/pov
  camera_movement TEXT,
  dialogue TEXT,
  notes TEXT,
  compositor_data TEXT, -- JSON 构图器数据
  generated_prompt TEXT, -- 生成的提示词
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scene_id) REFERENCES scenes(id)
);
```

#### shot_characters 镜头-角色关联表
```sql
CREATE TABLE shot_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shot_id INTEGER NOT NULL,
  character_id INTEGER NOT NULL,
  action TEXT, -- 角色在该镜头的动作
  image_id INTEGER, -- 使用的参考图
  FOREIGN KEY (shot_id) REFERENCES shots(id),
  FOREIGN KEY (character_id) REFERENCES characters(id),
  FOREIGN KEY (image_id) REFERENCES images(id)
);
```

---

## 📅 开发阶段

| 阶段 | 内容 | 复杂度 | 状态 |
|------|------|--------|------|
| **Phase 1** | 项目初始化 + 基础框架 + 导航布局 | ⭐ | ⬜ |
| **Phase 2** | 图片资产库（上传、分类、多视图标记、状态管理） | ⭐⭐ | ⬜ |
| **Phase 3** | 角色档案系统（CRUD、图片关联、提示词模板） | ⭐⭐ | ⬜ |
| **Phase 4** | 故事编辑器（富文本、章节管理、角色引用） | ⭐⭐ | ⬜ |
| **Phase 5** | 场景规划板（场景卡片、角色编排、背景图库） | ⭐⭐ | ⬜ |
| **Phase 6** | 分镜时间线（可视化编辑、拖拽排序、镜头卡片） | ⭐⭐⭐ | ⬜ |
| **Phase 7** | 镜头构图器（前中背景层次、POV设置、透视辅助） | ⭐⭐⭐ | ⬜ |
| **Phase 8** | ComfyUI集成（提示词生成器、工作流导出） | ⭐⭐⭐ | ⬜ |
| **Phase 9** | 剪辑技巧库 + 城市战斗素材库（数据整理、联动分镜） | ⭐⭐ | ⬜ |
| **Phase 10** | 打磨优化 + 导出功能 + 最终测试 | ⭐ | ⬜ |

---

## 🎨 UI设计规范

### 风格
- **简约现代**：清晰的布局，充足的留白
- **深色可选**：支持浅色/深色模式切换
- **专业感**：适合创作工作的专业工具感

### 配色方案
```css
/* 主色调 */
--primary: #6366f1;      /* Indigo */
--primary-dark: #4f46e5;
--primary-light: #818cf8;

/* 功能色 */
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;

/* 中性色 */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-800: #1f2937;
--gray-900: #111827;
```

### 布局
```
┌──────────────────────────────────────────────────┐
│  Header: Logo + 项目名 + 全局操作                 │
├────────────┬─────────────────────────────────────┤
│            │                                     │
│  Sidebar   │        Main Content                 │
│  导航菜单   │        页面内容区域                  │
│            │                                     │
│  - 仪表盘   │                                     │
│  - 图片库   │                                     │
│  - 角色    │                                     │
│  - 故事    │                                     │
│  - 场景    │                                     │
│  - 分镜    │                                     │
│  - 构图    │                                     │
│  - 技巧库  │                                     │
│  - 导出    │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

---

## 📝 内置数据示例

### 剪辑技巧示例
```json
{
  "shotTypes": [
    {
      "name": "推镜 (Dolly In)",
      "nameEn": "Dolly In",
      "description": "摄像机向前移动，逐渐靠近主体",
      "effect": "增强紧张感、引导观众聚焦",
      "usage": "揭示重要细节、人物情绪转变时",
      "comfyuiHint": "camera: dolly in, slow approach"
    }
  ],
  "transitions": [
    {
      "name": "匹配剪辑 (Match Cut)",
      "nameEn": "Match Cut",
      "description": "两个镜头通过相似形状/动作无缝衔接",
      "example": "机甲拳头 → 怪兽头部（相似圆形）",
      "usage": "时空转换、强调关联"
    }
  ]
}
```

### 城市战斗素材示例
```json
{
  "foreground": [
    "office interior with cracked window",
    "silhouette of person watching through glass",
    "venetian blinds partially open",
    "desk with coffee cup trembling"
  ],
  "middleground": [
    "destroyed skyscrapers",
    "fleeing crowds on street below",
    "military helicopters",
    "falling debris and glass shards"
  ],
  "background": [
    "giant mech firing energy beam",
    "kaiju roaring in destruction",
    "explosions and smoke plumes",
    "collapsing building in distance"
  ],
  "atmosphere": [
    "apocalyptic atmosphere",
    "orange sunset with fire glow",
    "dust and smoke filling the air",
    "lens flare from explosions"
  ]
}
```

---

## ✅ 验收标准

### Phase 1 验收
- [ ] 项目可正常启动（前端 + 后端）
- [ ] 基础布局和导航功能正常
- [ ] 数据库初始化成功

### Phase 2 验收
- [ ] 图片可上传并显示
- [ ] 图片可分类和标记
- [ ] 图片状态可切换

### Phase 3 验收
- [ ] 角色可创建/编辑/删除
- [ ] 角色可关联图片
- [ ] 角色提示词模板可保存

（后续阶段验收标准在开发时补充）

---

## 🚀 启动命令

```bash
# 开发模式
npm run dev          # 同时启动前后端

# 仅前端
npm run dev:client

# 仅后端
npm run dev:server

# 生产构建
npm run build
npm run start
```

---

*文档版本: v1.0*
*创建时间: 2024*
*作者: FilmDream Studio Team*
