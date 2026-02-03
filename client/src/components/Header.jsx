import { useLocation } from 'react-router-dom'
import { Bell, Settings, HelpCircle } from 'lucide-react'

const pageTitles = {
  '/': '仪表盘',
  '/gallery': '图片资产库',
  '/characters': '角色档案',
  '/story': '故事编辑器',
  '/scenes': '场景规划',
  '/timeline': '分镜时间线',
  '/compositor': '镜头构图器',
  '/techniques': '剪辑技巧库',
  '/export': 'ComfyUI导出',
}

export default function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'FilmDream Studio'
  
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      
      <div className="flex items-center space-x-2">
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <HelpCircle className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
