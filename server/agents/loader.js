/**
 * Agent Loader - 从 Markdown 文件加载 Agent 定义
 * 
 * 参考 OpenCode 的设计：
 * - Markdown 文件定义 Agent
 * - YAML frontmatter 声明元信息
 * - Markdown 内容作为 System Prompt
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 解析 Markdown frontmatter
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { metadata: {}, content: content }
  }
  
  const yamlContent = match[1]
  const markdownContent = match[2]
  
  // 简单的 YAML 解析（不引入依赖）
  const metadata = parseSimpleYaml(yamlContent)
  
  return { metadata, content: markdownContent.trim() }
}

/**
 * 简单的 YAML 解析器
 * 支持: 字符串、数字、布尔、数组、简单对象
 */
function parseSimpleYaml(yaml) {
  const result = {}
  const lines = yaml.split('\n')
  let currentKey = null
  let currentArray = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    
    // 数组项
    if (trimmed.startsWith('- ')) {
      if (currentArray !== null) {
        currentArray.push(trimmed.slice(2).trim())
      }
      continue
    }
    
    // 键值对
    const colonIndex = trimmed.indexOf(':')
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim()
      const value = trimmed.slice(colonIndex + 1).trim()
      
      if (value === '') {
        // 可能是数组或对象的开始
        currentKey = key
        currentArray = []
        result[key] = currentArray
      } else {
        currentKey = null
        currentArray = null
        result[key] = parseValue(value)
      }
    }
  }
  
  return result
}

/**
 * 解析 YAML 值
 */
function parseValue(value) {
  // 布尔
  if (value === 'true') return true
  if (value === 'false') return false
  
  // 数字
  if (/^-?\d+$/.test(value)) return parseInt(value, 10)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  
  // 字符串（去除引号）
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  
  // 特殊值
  if (value === 'all') return null // tools: all 表示所有工具
  
  return value
}

/**
 * Agent 定义
 */
export class AgentDefinition {
  constructor(options) {
    this.id = options.id || options.name
    this.name = options.name
    this.description = options.description || ''
    this.mode = options.mode || 'subagent' // primary | subagent
    this.priority = options.priority || 0
    this.tools = options.tools || null // null = all, array = specific tools
    this.systemPrompt = options.systemPrompt || ''
    this.model = options.model || null // 可指定特定模型
    this.temperature = options.temperature || null
    this.disabled = options.disabled || false
    this.role = options.role || this.name // 角色描述
    this.capabilities = options.capabilities || [] // 能力列表
  }

  /**
   * 获取完整的 System Prompt（包含团队信息等）
   */
  getFullPrompt(context = {}) {
    let prompt = this.systemPrompt

    // 如果是 director，添加团队信息
    if (this.id === 'director' && context.teamPrompt) {
      prompt += '\n\n' + context.teamPrompt
    }

    // 添加可用工具列表
    if (context.availableTools && this.tools !== null) {
      prompt += '\n\n## 可用工具\n\n'
      prompt += this.tools.map(t => `- \`${t}\``).join('\n')
    }

    return prompt
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      mode: this.mode,
      priority: this.priority,
      tools: this.tools,
      model: this.model,
      role: this.role,
      capabilities: this.capabilities
    }
    }
}

/**
 * Agent Loader
 */
export class AgentLoader {
  constructor() {
    this.agents = new Map()
    this.loadPaths = [
      join(__dirname, 'presets'), // 内置 agents
    ]
  }

  /**
   * 添加加载路径
   */
  addPath(path) {
    if (!this.loadPaths.includes(path)) {
      this.loadPaths.push(path)
    }
    return this
  }

  /**
   * 加载所有 Agents
   */
  loadAll() {
    for (const loadPath of this.loadPaths) {
      if (!existsSync(loadPath)) continue

      const files = readdirSync(loadPath).filter(f => f.endsWith('.md'))
      
      for (const file of files) {
        try {
          const agent = this.loadFile(join(loadPath, file))
          if (agent && !agent.disabled) {
            this.agents.set(agent.id, agent)
          }
        } catch (error) {
          console.warn(`Failed to load agent ${file}:`, error.message)
        }
      }
    }

    console.log(`Loaded ${this.agents.size} agents:`, Array.from(this.agents.keys()))
    return this
  }

  /**
   * 从文件加载单个 Agent
   */
  loadFile(filePath) {
    const content = readFileSync(filePath, 'utf-8')
    const { metadata, content: systemPrompt } = parseFrontmatter(content)
    
    // 文件名作为默认 ID
    const fileId = basename(filePath, '.md')
    
    return new AgentDefinition({
      id: metadata.name || fileId,
      name: metadata.name || fileId,
      description: metadata.description,
      mode: metadata.mode,
      priority: metadata.priority,
      tools: metadata.tools,
      model: metadata.model,
      temperature: metadata.temperature,
      disabled: metadata.disabled,
      role: metadata.role,
      capabilities: metadata.capabilities,
      systemPrompt
    })
  }

  /**
   * 获取 Agent
   */
  get(id) {
    return this.agents.get(id)
  }

  /**
   * 获取所有 Agents
   */
  getAll() {
    return Array.from(this.agents.values())
  }

  /**
   * 获取 Primary Agents
   */
  getPrimary() {
    return this.getAll().filter(a => a.mode === 'primary')
  }

  /**
   * 获取 Subagents
   */
  getSubagents() {
    return this.getAll().filter(a => a.mode === 'subagent')
  }

  /**
   * 根据能力/工具查找 Agent
   */
  findByTool(toolName) {
    return this.getAll().filter(agent => 
      agent.tools === null || agent.tools.includes(toolName)
    )
  }

  /**
   * 生成团队介绍 Prompt
   */
  getTeamPrompt() {
    const subagents = this.getSubagents()
    
    let prompt = '## 你的团队\n\n'
    prompt += '你可以将任务委派给以下专业人员：\n\n'
    
    for (const agent of subagents) {
      prompt += `### ${agent.name} (\`${agent.id}\`)\n`
      prompt += `${agent.description}\n\n`
    }
    
    prompt += '\n使用 `delegate_task` 工具来分配任务。'
    
    return prompt
  }
}

// 单例
const agentLoader = new AgentLoader()

export { agentLoader }
export default AgentLoader
