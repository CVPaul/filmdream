import { useEffect } from 'react'
import { ListTodo, RefreshCw, Loader2, CheckCircle, XCircle, Clock, X, AlertCircle, Inbox } from 'lucide-react'
import useTaskStore from '../stores/taskStore'

const TYPE_LABELS = {
  image_gen: { label: '图片生成', color: 'bg-purple-100 text-purple-700' },
  prompt_polish: { label: '提示词润色', color: 'bg-orange-100 text-orange-700' },
  storyboard_gen: { label: '分镜生成', color: 'bg-teal-100 text-teal-700' },
}

const STATUS_CONFIG = {
  pending:   { label: '等待中', color: 'bg-yellow-100 text-yellow-700', Icon: Clock },
  running:   { label: '运行中', color: 'bg-blue-100 text-blue-700',   Icon: Loader2, spin: true },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700',  Icon: CheckCircle },
  failed:    { label: '失败',   color: 'bg-red-100 text-red-700',      Icon: XCircle },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-500',    Icon: X },
}

function formatTime(iso) {
  if (!iso) return '--'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function Tasks() {
  const { tasks, stats, loading, error, loadTasks, loadStats, cancelTask, retryTask, startPolling, stopPolling, clearError } = useTaskStore()

  useEffect(() => {
    loadTasks()
    loadStats()
  }, [])

  useEffect(() => {
    const hasActive = tasks.some(t => t.status === 'running' || t.status === 'pending')
    if (hasActive) startPolling()
    return () => stopPolling()
  }, [tasks.length])

  const handleRefresh = () => { loadTasks(); loadStats() }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="w-7 h-7 text-primary-600" />
            任务队列
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI任务执行监控</p>
        </div>
        <button onClick={handleRefresh} disabled={loading}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '全部', value: stats.total, color: 'text-gray-700 bg-gray-50' },
          { label: '运行中', value: stats.running, color: 'text-blue-700 bg-blue-50' },
          { label: '已完成', value: stats.completed, color: 'text-green-700 bg-green-50' },
          { label: '失败', value: stats.failed, color: 'text-red-700 bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-3 ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={clearError} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Task list */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Inbox className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>暂无任务</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
            const type = TYPE_LABELS[task.type] || { label: task.type, color: 'bg-gray-100 text-gray-700' }
            return (
              <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${type.color}`}>{type.label}</span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        <status.Icon className={`w-3 h-3 ${status.spin ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                    {task.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.description}</p>}
                    {task.status === 'running' && (
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${task.progress || 0}%` }} />
                      </div>
                    )}
                    {task.error && <p className="text-xs text-red-500 mt-1 line-clamp-2">{task.error}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {(task.status === 'pending' || task.status === 'running') && (
                      <button onClick={() => cancelTask(task.id)}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        取消
                      </button>
                    )}
                    {task.status === 'failed' && (
                      <button onClick={() => retryTask(task.id)}
                        className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        重试
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{formatTime(task.createdAt)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
