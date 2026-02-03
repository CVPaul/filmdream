import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import useUIStore from '../stores/uiStore'

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-800',
    iconColor: 'text-green-500',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500',
  },
}

export default function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type] || typeConfig.info
        const Icon = config.icon

        return (
          <div
            key={toast.id}
            className={`flex items-start p-4 rounded-lg border shadow-lg ${config.bgColor} ${config.borderColor} animate-slide-in`}
          >
            <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0`} />
            <p className={`ml-3 text-sm ${config.textColor} flex-1`}>
              {toast.message}
            </p>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-3 ${config.iconColor} hover:opacity-70`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
