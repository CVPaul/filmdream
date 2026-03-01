import { useState, useEffect } from 'react'
import { Workflow, Clock, CheckCircle, XCircle, Loader2, X, AlertCircle, RefreshCw, Play } from 'lucide-react'
import clsx from 'clsx'
import usePipelineStore from '../stores/pipelineStore'
import DagVisualization from '../components/pipeline/DagVisualization'
import PipelineTrigger from '../components/pipeline/PipelineTrigger'

const PIPELINE_STATUS_CONFIG = {
  idle:      { label: '空闲',   color: 'bg-gray-100 text-gray-500',   icon: Clock },
  running:   { label: '运行中', color: 'bg-blue-100 text-blue-700',   icon: Loader2, animate: true },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  failed:    { label: '失败',   color: 'bg-red-100 text-red-700',     icon: XCircle },
  cancelled: { label: '已取消', color: 'bg-gray-100 text-gray-400',   icon: X },
}

function PipelineStatusBadge({ status }) {
  const config = PIPELINE_STATUS_CONFIG[status] || PIPELINE_STATUS_CONFIG.idle
  const Icon = config.icon
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium', config.color)}>
      <Icon className={clsx('w-3 h-3', config.animate && 'animate-spin')} />
      {config.label}
    </span>
  )
}

export default function Pipeline() {
  const {
    pipelines, currentPipeline, isStreaming, error,
    loadPipelines, loadPipelineStatus, connectSSE, disconnectSSE,
    cancelPipeline, restartPhase, clearError
  } = usePipelineStore()

  const [showTrigger, setShowTrigger] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

  useEffect(() => {
    loadPipelines()
    return () => disconnectSSE()
  }, [])

  const handleSelectPipeline = async (pipeline) => {
    setSelectedId(pipeline.id)
    setSelectedTask(null)
    await loadPipelineStatus(pipeline.id)
    connectSSE(pipeline.id)
  }

  const handleTriggerSuccess = async (pipelineId) => {
    setShowTrigger(false)
    await loadPipelines()
    handleSelectPipeline({ id: pipelineId })
  }

  const phaseCount = currentPipeline?.phases?.length || 0
  const completedPhases = currentPipeline?.phases?.filter(p => p.status === 'completed').length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Workflow className="w-7 h-7 text-primary-600" />
            制作流水线
          </h1>
          <p className="text-sm text-gray-500 mt-1">AI驱动的自动化电影制作</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPipelines()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowTrigger(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            新建流水线
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* Left: pipeline history list */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">
                流水线历史
                {pipelines.length > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">({pipelines.length})</span>
                )}
              </h2>
            </div>

            {pipelines.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Workflow className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">暂无流水线记录</p>
                <p className="text-xs text-gray-300 mt-1">点击「新建流水线」开始</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {pipelines.map(pipeline => {
                  const phases = pipeline.phases || []
                  const done = phases.filter(p => p.status === 'completed').length
                  return (
                    <button
                      key={pipeline.id}
                      onClick={() => handleSelectPipeline(pipeline)}
                      className={clsx(
                        'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors',
                        selectedId === pipeline.id && 'bg-primary-50 border-l-2 border-primary-500'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-gray-400">#{pipeline.id.slice(-8)}</span>
                        <PipelineStatusBadge status={pipeline.status} />
                      </div>
                      <p className="text-sm text-gray-700 truncate">{pipeline.concept}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {done}/{phases.length} 阶段完成
                        </span>
                        <span className="text-xs text-gray-300">
                          {new Date(pipeline.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: pipeline detail panel */}
        <div className="xl:col-span-3">
          {!currentPipeline ? (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-16 text-center">
              <Workflow className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">选择一个流水线查看详情</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200">
              {/* Detail header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <PipelineStatusBadge status={currentPipeline.status} />
                  {isStreaming && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      实时更新中
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">{currentPipeline.concept}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {completedPhases}/{phaseCount} 阶段完成
                  {currentPipeline.createdAt && (
                    <> · {new Date(currentPipeline.createdAt).toLocaleString('zh-CN')}</>
                  )}
                </p>
              </div>

              {/* DAG visualization */}
              {phaseCount > 0 && (
                <div className="px-6 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">任务依赖图</h3>
                  <div id="dag-container">
                    <DagVisualization
                      phases={currentPipeline.phases || []}
                      tasks={[]}
                      onTaskClick={setSelectedTask}
                    />
                  </div>
                </div>
              )}

              {/* Phase breakdown list */}
              <div className="px-6 py-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">阶段列表</h3>
                <div className="space-y-2">
                  {(currentPipeline.phases || []).map(phase => {
                    const phaseTasks = phase.tasks || []
                    const doneCount = phaseTasks.filter(t => t.status === 'completed').length
                    return (
                      <div key={phase.id} className="rounded-lg border border-gray-100 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <PipelineStatusBadge status={phase.status} />
                            <span className="text-sm text-gray-700">{phase.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              {doneCount}/{phaseTasks.length} 任务
                            </span>
                            {(phase.status === 'completed' || phase.status === 'failed') &&
                              currentPipeline.status !== 'running' && (
                              <button
                                onClick={() => restartPhase(currentPipeline.id, phase.id)}
                                className="text-xs text-primary-600 hover:text-primary-800 transition-colors"
                              >
                                重新运行
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cancel button (when running) */}
              {currentPipeline.status === 'running' && (
                <div className="px-6 pb-4">
                  <button
                    onClick={() => cancelPipeline(currentPipeline.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    取消流水线
                  </button>
                </div>
              )}

              {/* Selected task detail accordion */}
              {selectedTask && (
                <div className="px-6 pb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        任务详情: {selectedTask.action}
                      </span>
                      <button
                        onClick={() => setSelectedTask(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {selectedTask.result && (
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32 whitespace-pre-wrap">
                        {typeof selectedTask.result === 'string'
                          ? selectedTask.result
                          : JSON.stringify(selectedTask.result, null, 2)}
                      </pre>
                    )}
                    {selectedTask.error && (
                      <p className="text-xs text-red-600">{selectedTask.error}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* New pipeline trigger modal */}
      {showTrigger && (
        <PipelineTrigger
          onClose={() => setShowTrigger(false)}
          onSuccess={handleTriggerSuccess}
        />
      )}
    </div>
  )
}
