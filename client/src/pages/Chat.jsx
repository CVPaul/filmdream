/**
 * Chat 页面 - AI 助手对话界面
 */

import { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  Settings, 
  Bot, 
  User,
  Loader2,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Copy,
  Wrench,
  ChevronDown,
  ChevronRight,
  LogOut,
  RefreshCw,
  Plus,
  History,
  MoreVertical,
  Edit3,
  X,
  PanelLeftClose,
  PanelLeft,
  Users,
} from 'lucide-react'
import clsx from 'clsx'
import useChatStore from '../stores/chatStore'

// Markdown 简单渲染（可以后续替换为更完整的库）
function renderMarkdown(text) {
  if (!text) return null
  
  // 代码块
  let html = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => 
    `<pre class="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2"><code class="text-sm">${escapeHtml(code.trim())}</code></pre>`
  )
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-pink-600">$1</code>')
  
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // 换行
  html = html.replace(/\n/g, '<br/>')
  
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 工具调用显示组件
function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false)
  
  let result = null
  try {
    result = JSON.parse(toolCall.result)
  } catch (e) {
    result = toolCall.result
  }
  
  const isError = result?.error
  
  return (
    <div className={clsx(
      "border rounded-lg my-2 text-sm",
      isError ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"
    )}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <Wrench className={clsx("w-4 h-4", isError ? "text-red-500" : "text-blue-500")} />
          <span className="font-medium">{toolCall.name}</span>
          {toolCall.status === 'calling' && (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          {toolCall.status === 'done' && !isError && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          {isError && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {toolCall.arguments && (
            <div>
              <p className="text-xs text-gray-500 mb-1">参数:</p>
              <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
                {typeof toolCall.arguments === 'string' 
                  ? toolCall.arguments 
                  : JSON.stringify(JSON.parse(toolCall.arguments), null, 2)}
              </pre>
            </div>
          )}
          {result && (
            <div>
              <p className="text-xs text-gray-500 mb-1">结果:</p>
              <pre className={clsx(
                "p-2 rounded text-xs overflow-x-auto max-h-48",
                isError ? "bg-red-100" : "bg-white"
              )}>
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 消息组件
function Message({ message, toolCallHistory }) {
  const isUser = message.role === 'user'
  
  // 找出这条消息相关的工具调用
  const relatedToolCalls = message.toolCalls || 
    (message.role === 'assistant' && toolCallHistory?.length > 0 ? toolCallHistory : [])
  
  return (
    <div className={clsx(
      "flex gap-3 py-4",
      isUser ? "flex-row-reverse" : ""
    )}>
      <div className={clsx(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary-100" : "bg-gray-100"
      )}>
        {isUser ? (
          <User className="w-5 h-5 text-primary-600" />
        ) : (
          <Bot className="w-5 h-5 text-gray-600" />
        )}
      </div>
      
      <div className={clsx(
        "flex-1 max-w-[80%]",
        isUser ? "text-right" : ""
      )}>
        <div className={clsx(
          "inline-block rounded-lg px-4 py-2 text-left",
          isUser 
            ? "bg-primary-600 text-white" 
            : "bg-gray-100 text-gray-900"
        )}>
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">思考中...</span>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              {renderMarkdown(message.content)}
            </div>
          )}
        </div>
        
        {/* 工具调用 */}
        {!isUser && relatedToolCalls.length > 0 && (
          <div className="mt-2">
            {relatedToolCalls.map((tc, idx) => (
              <ToolCallDisplay key={tc.id || idx} toolCall={tc} />
            ))}
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

// OAuth 认证对话框
function AuthDialog({ provider, onClose }) {
  const { deviceFlowInfo, pollAuth, isAuthenticating } = useChatStore()
  const [status, setStatus] = useState('waiting')
  const [statusMessage, setStatusMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const pollIntervalRef = useRef(null)
  const retryCountRef = useRef(0)
  
  useEffect(() => {
    if (deviceFlowInfo && provider && status === 'waiting') {
      // 开始轮询
      const interval = (deviceFlowInfo.interval || 5) * 1000
      
      const poll = async () => {
        const result = await pollAuth(provider, deviceFlowInfo.deviceCode)
        
        if (result.status === 'success') {
          setStatus('success')
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setTimeout(onClose, 1500)
        } else if (result.status === 'retry') {
          // 网络问题，继续重试
          retryCountRef.current += 1
          setRetryCount(retryCountRef.current)
          setStatusMessage(result.message || '网络连接中...')
        } else if (result.status === 'expired' || result.status === 'denied') {
          setStatus('error')
          setStatusMessage(result.message || '授权失败')
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        } else if (result.status === 'error') {
          // 显示错误但继续轮询（可能是暂时的网络问题）
          retryCountRef.current += 1
          setRetryCount(retryCountRef.current)
          setStatusMessage(result.message || '发生错误')
          if (retryCountRef.current > 20) {
            // 超过 20 次重试，停止
            setStatus('error')
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current)
              pollIntervalRef.current = null
            }
          }
        }
        // pending 状态继续轮询
      }
      
      // 立即执行一次
      poll()
      // 然后开始定时轮询
      pollIntervalRef.current = setInterval(poll, interval)
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }
    }
  }, [deviceFlowInfo, provider, status, pollAuth, onClose])
  
  const copyCode = () => {
    navigator.clipboard.writeText(deviceFlowInfo?.userCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  if (!deviceFlowInfo) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">GitHub Copilot 授权</h3>
        
        {status === 'waiting' && (
          <>
            <p className="text-gray-600 mb-4">
              请在浏览器中打开以下链接，并输入授权码：
            </p>
            
            <a
              href={deviceFlowInfo.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4"
            >
              {deviceFlowInfo.verificationUri}
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <div className="bg-gray-100 rounded-lg p-4 text-center mb-4">
              <p className="text-sm text-gray-500 mb-2">授权码</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-2xl font-mono font-bold tracking-wider">
                  {deviceFlowInfo.userCode}
                </code>
                <button
                  onClick={copyCode}
                  className="p-2 hover:bg-gray-200 rounded"
                >
                  {copied ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>等待授权完成...</span>
            </div>
            
            {statusMessage && (
              <p className="mt-2 text-sm text-center text-amber-600">
                {statusMessage} {retryCount > 0 && `(重试 ${retryCount} 次)`}
              </p>
            )}
          </>
        )}
        
        {status === 'success' && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-green-600">授权成功！</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center py-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-red-600">授权失败或已过期</p>
            {statusMessage && (
              <p className="mt-2 text-sm text-gray-500">{statusMessage}</p>
            )}
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              关闭
            </button>
          </div>
        )}
        
        {status === 'waiting' && (
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700"
          >
            取消
          </button>
        )}
      </div>
    </div>
  )
}

// 设置面板
function SettingsPanel({ onClose }) {
  const { 
    providers, 
    models, 
    currentProvider, 
    currentModel, 
    authStatus,
    deviceFlowInfo,
    agents,
    currentAgentId,
    setModel,
    setAgent,
    startAuth,
    logout,
    loadProviders,
    loadModels,
    checkAuthStatus,
    setApiKey
  } = useChatStore()
  
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authProvider, setAuthProvider] = useState(null)
  const [authError, setAuthError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // API Key 配置状态
  const [showApiKeyInput, setShowApiKeyInput] = useState(null) // 存储正在配置的 provider id
  const [apiKeyInput, setApiKeyInput] = useState('')
  
  useEffect(() => {
    loadProviders()
    loadModels()
    checkAuthStatus()
  }, [])
  
  const handleStartAuth = async (providerId) => {
    const provider = providers.find(p => p.id === providerId)
    
    // 如果是 API Key 类型的 provider，显示 API Key 输入界面
    if (provider?.authType === 'api_key') {
      setShowApiKeyInput(providerId)
      setApiKeyInput('')
      setAuthError('')
      return
    }
    
    // 否则使用 Device Flow (OAuth)
    setAuthProvider(providerId)
    setAuthError('')
    try {
      await startAuth(providerId)
      setShowAuthDialog(true)
    } catch (error) {
      setAuthError(error.message)
    }
  }
  
  const handleApiKeySubmit = async () => {
    if (!apiKeyInput.trim() || !showApiKeyInput) return
    setIsSubmitting(true)
    setAuthError('')
    
    const result = await setApiKey(showApiKeyInput, apiKeyInput.trim())
    
    setIsSubmitting(false)
    if (result.success) {
      setShowApiKeyInput(null)
      setApiKeyInput('')
    } else {
      setAuthError(result.error || '设置 API Key 失败')
    }
  }
  
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">LLM 设置</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>
        
        {/* 错误提示 */}
        {authError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {authError}
          </div>
        )}
        
        
        {/* API Key 配置界面 */}
        {showApiKeyInput && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">
              配置 {providers.find(p => p.id === showApiKeyInput)?.name || showApiKeyInput}
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              请输入 API Key。
              {providers.find(p => p.id === showApiKeyInput)?.apiKeyUrl && (
                <> 获取地址：
                  <a 
                    href={providers.find(p => p.id === showApiKeyInput)?.apiKeyUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="underline"
                  >
                    {providers.find(p => p.id === showApiKeyInput)?.apiKeyUrl}
                  </a>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="输入 API Key..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleApiKeySubmit}
                disabled={!apiKeyInput.trim() || isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '确定'}
              </button>
            </div>
            <button
              onClick={() => { setShowApiKeyInput(null); setApiKeyInput(''); setAuthError(''); }}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        )}
        
        {/* Provider 列表 */}
        <div className="mb-6">
          <h4 className="font-medium mb-3">Provider</h4>
          <div className="space-y-2">
            {providers.map(provider => (
              <div 
                key={provider.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-sm text-gray-500">
                    {provider.isConfigured ? '已连接' : '未连接'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {provider.isConfigured ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <button
                        onClick={() => logout(provider.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="登出"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleStartAuth(provider.id)}
                        className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
                      >
                        连接
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 模型选择 */}
        {models.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">选择模型</h4>
            <div className="space-y-3">
              {models.map(providerModels => (
                <div key={providerModels.provider}>
                  <p className="text-sm text-gray-500 mb-2">{providerModels.providerName}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {providerModels.models.map(model => (
                      <button
                        key={model.id}
                        onClick={() => setModel(providerModels.provider, model.id)}
                        className={clsx(
                          "p-2 border rounded-lg text-left text-sm transition-colors",
                          currentProvider === providerModels.provider && currentModel === model.id
                            ? "border-primary-500 bg-primary-50"
                            : "hover:bg-gray-50"
                        )}
                      >
                        <p className="font-medium">{model.name}</p>
                        {model.description && (
                          <p className="text-xs text-gray-400 truncate">{model.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent 选择 */}
        {agents.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Agent 选择</h4>
            <div className="grid grid-cols-2 gap-2">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setAgent(agent.id)}
                  className={clsx(
                    "p-2 border rounded-lg text-left text-sm transition-colors",
                    currentAgentId === agent.id
                      ? "border-primary-500 bg-primary-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-gray-400 truncate">{agent.role}</p>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {showAuthDialog && (
          <AuthDialog 
            provider={authProvider} 
            onClose={() => {
              setShowAuthDialog(false)
              loadModels()
              checkAuthStatus()
            }} 
          />
        )}
      </div>
    </div>
  )
}

// 会话列表项
function ConversationItem({ conversation, isActive, onSelect, onDelete, onRename }) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const menuRef = useRef(null)
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(conversation.id, editTitle.trim())
    }
    setIsEditing(false)
  }
  
  return (
    <div
      className={clsx(
        "group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
        isActive 
          ? "bg-primary-100 text-primary-700" 
          : "hover:bg-gray-100 text-gray-700"
      )}
      onClick={() => !isEditing && onSelect(conversation.id)}
    >
      <MessageSquare className="w-4 h-4 flex-shrink-0" />
      
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="flex-1 text-sm bg-white border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{conversation.title}</span>
      )}
      
      {/* 菜单按钮 */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className={clsx(
            "p-1 rounded hover:bg-gray-200 transition-opacity",
            showMenu ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
                setEditTitle(conversation.title)
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit3 className="w-4 h-4" />
              重命名
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(conversation.id)
                setShowMenu(false)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// 会话侧边栏
function ConversationSidebar({ isOpen, onClose }) {
  const {
    conversations,
    currentConversationId,
    isLoadingConversations,
    loadConversations,
    selectConversation,
    deleteConversation,
    updateConversationTitle,
    startNewChat
  } = useChatStore()
  
  useEffect(() => {
    loadConversations()
  }, [])
  
  if (!isOpen) return null
  
  return (
    <div className="w-72 border-r bg-gray-50 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium">对话历史</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200 rounded-lg lg:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* 新建对话按钮 */}
      <div className="p-3">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新对话
        </button>
      </div>
      
      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {isLoadingConversations ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无对话记录</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={selectConversation}
                onDelete={deleteConversation}
                onRename={updateConversationTitle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 主页面
export default function Chat() {
  const { 
    messages, 
    isLoading, 
    isStreaming, 
    error,
    toolCallHistory,
    currentModel,
    authStatus,
    currentConversationId,
    agents,
    currentAgentId,
    sendMessage,
    sendMessageStream,
    clearMessages,
    clearError,
    loadProviders,
    loadModels,
    checkAuthStatus,
    startNewChat,
    loadConversations,
    loadAgents,
    setAgent
  } = useChatStore()
  
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [useStream, setUseStream] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  
  // 初始化
  useEffect(() => {
    loadProviders()
    loadModels()
    checkAuthStatus()
    loadConversations()
    loadAgents()
  }, [])
  
  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolCallHistory])
  
  // 检查是否已认证
  const isAuthenticated = Object.values(authStatus).some(v => v)
  const currentAgentName = agents.find(a => a.id === currentAgentId)?.name || currentAgentId
  
  // 发送消息
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading || isStreaming) return
    
    const content = input.trim()
    setInput('')
    
    try {
      if (useStream) {
        await sendMessageStream(content)
      } else {
        await sendMessage(content)
      }
    } catch (error) {
      console.error('Send message error:', error)
    }
    
    inputRef.current?.focus()
  }
  
  return (
    <div className="h-full flex">
      {/* 会话侧边栏 */}
      <ConversationSidebar 
        isOpen={showSidebar} 
        onClose={() => setShowSidebar(false)} 
      />
      
      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            {/* 侧边栏切换按钮 */}
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title={showSidebar ? "隐藏历史" : "显示历史"}
            >
              {showSidebar ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
            </button>
            
            <MessageSquare className="w-6 h-6 text-primary-600" />
            <div>
              <h1 className="text-xl font-semibold">AI 助手</h1>
              <p className="text-sm text-gray-500">
                当前模型: {currentModel} | Agent: {currentAgentName}
                {currentConversationId && <span className="ml-2 text-xs text-gray-400">#{currentConversationId}</span>}
              </p>
            </div>
          </div>
            
            {/* Agent 选择器 */}
            {agents.length > 0 && (
              <div className="relative">
                <select
                  value={currentAgentId}
                  onChange={(e) => setAgent(e.target.value)}
                  className="appearance-none bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            )}
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
                className="rounded"
              />
              流式输出
            </label>
            
            <button
              onClick={startNewChat}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="新对话"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      
        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              &times;
            </button>
          </div>
        )}
        
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-6">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-600 mb-2">FilmDream AI 助手</h2>
                <p className="text-gray-400 mb-6">
                  我可以帮助你管理电影项目、创建场景和角色、设计分镜头，以及生成 ComfyUI 工作流提示词。
                </p>
                
                {!isAuthenticated ? (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    连接 LLM Provider
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 mb-3">试试这些指令:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        '查看项目统计',
                        '列出所有角色',
                        '创建一个新场景',
                        '帮我设计一个机甲角色'
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(prompt)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-4">
              {messages.map((message, idx) => (
                <Message 
                  key={message.id} 
                  message={message}
                  toolCallHistory={idx === messages.length - 1 ? toolCallHistory : []}
                />
              ))}
              
              {/* 加载中 */}
              {isLoading && !isStreaming && (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>思考中...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* 输入区域 */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isAuthenticated ? "输入消息..." : "请先连接 LLM Provider..."}
              disabled={!isAuthenticated || isLoading || isStreaming}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || !isAuthenticated || isLoading || isStreaming}
              className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading || isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
        
        {/* 设置面板 */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} />
        )}
      </div>
    </div>
  )
}
