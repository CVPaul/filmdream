import { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'

const TASK_STATUS_COLORS = {
  pending:   'bg-gray-100 border-gray-300 text-gray-600',
  running:   'bg-blue-50 border-blue-400 text-blue-700',
  completed: 'bg-green-50 border-green-400 text-green-700',
  failed:    'bg-red-50 border-red-400 text-red-700',
}

const PHASE_COLORS = {
  pending:   'bg-gray-50 border-gray-200',
  running:   'bg-blue-50 border-blue-200',
  completed: 'bg-green-50 border-green-200',
  failed:    'bg-red-50 border-red-200',
}

const AGENT_LABELS = {
  director:   '导演',
  character:  '角色',
  scene:      '场景',
  storyboard: '分镜',
  comfyui:    'ComfyUI',
}

export default function DagVisualization({ phases = [], tasks: propTasks = [], onTaskClick }) {
  const [paths, setPaths] = useState([])
  const nodeRefs = useRef({})
  const containerRef = useRef(null)

  // Derive flat tasks from phases if propTasks is empty
  const allTasks = propTasks.length > 0
    ? propTasks
    : phases.flatMap(p => (p.tasks || []).map(t => ({ ...t, phaseId: p.id })))

  // Sort phases by order
  const sortedPhases = [...phases].sort((a, b) => (a.order || 0) - (b.order || 0))

  useEffect(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newPaths = []

    allTasks.forEach(task => {
      if (!task.dependencies || task.dependencies.length === 0) return
      const toEl = nodeRefs.current[task.id]
      if (!toEl) return
      const toRect = toEl.getBoundingClientRect()
      const x2 = toRect.left - containerRect.left
      const y2 = toRect.top + toRect.height / 2 - containerRect.top

      task.dependencies.forEach(depId => {
        const fromEl = nodeRefs.current[depId]
        if (!fromEl) return
        const fromRect = fromEl.getBoundingClientRect()
        const x1 = fromRect.right - containerRect.left
        const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
        const cx1 = x1 + 60
        const cx2 = x2 - 60
        newPaths.push({
          id: `${depId}-${task.id}`,
          d: `M ${x1},${y1} C ${cx1},${y1} ${cx2},${y2} ${x2},${y2}`,
        })
      })
    })

    setPaths(newPaths)
  }, [phases, allTasks])

  if (phases.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        暂无流水线阶段数据
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative overflow-x-auto" style={{ minHeight: '200px' }}>
      <div className="flex gap-6 p-4 pb-8">
        {sortedPhases.map(phase => {
          const phaseTasks = allTasks.filter(t => t.phaseId === phase.id)
          const completedCount = phaseTasks.filter(t => t.status === 'completed').length
          return (
            <div
              key={phase.id}
              className={clsx(
                'w-48 flex-shrink-0 rounded-xl border p-3',
                PHASE_COLORS[phase.status] || PHASE_COLORS.pending
              )}
            >
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 truncate">{phase.name}</p>
                <p className="text-xs text-gray-400">{completedCount}/{phaseTasks.length}</p>
              </div>
              <div className="space-y-2">
                {phaseTasks.map(task => (
                  <div
                    key={task.id}
                    ref={el => { if (el) nodeRefs.current[task.id] = el }}
                    onClick={() => onTaskClick?.(task)}
                    className={clsx(
                      'rounded-lg border px-2 py-1.5 cursor-pointer hover:opacity-80 transition-opacity',
                      TASK_STATUS_COLORS[task.status] || TASK_STATUS_COLORS.pending,
                      task.status === 'running' && 'animate-pulse'
                    )}
                  >
                    <p className="text-xs font-medium truncate">
                      {AGENT_LABELS[task.agentId] || task.agentId}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{task.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        {paths.map(p => (
          <path
            key={p.id}
            d={p.d}
            stroke="#9CA3AF"
            strokeWidth="1.5"
            fill="none"
            opacity="0.7"
          />
        ))}
      </svg>
    </div>
  )
}
