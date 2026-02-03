import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Image, 
  Users, 
  BookOpen, 
  Map, 
  Film, 
  Layers, 
  GraduationCap, 
  Download,
  Clapperboard,
  Mic
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘', description: '项目概览' },
  { path: '/gallery', icon: Image, label: '图片库', description: '管理AI生成的图片' },
  { path: '/characters', icon: Users, label: '角色档案', description: '机甲、怪兽、人物' },
  { path: '/story', icon: BookOpen, label: '故事编辑', description: '剧本和故事大纲' },
  { path: '/scenes', icon: Map, label: '场景规划', description: '场景和环境设计' },
  { path: '/timeline', icon: Film, label: '分镜时间线', description: '镜头序列编排' },
  { path: '/voiceover', icon: Mic, label: '配音管理', description: '台词和语音配置' },
  { path: '/compositor', icon: Layers, label: '镜头构图', description: '多层次构图规划' },
  { path: '/techniques', icon: GraduationCap, label: '技巧库', description: '剪辑和拍摄技巧' },
  { path: '/export', icon: Download, label: 'ComfyUI导出', description: '工作流导出' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo区域 */}
      <div className="h-16 flex items-center px-4 border-b border-gray-200">
        <Clapperboard className="w-8 h-8 text-primary-600" />
        <div className="ml-3">
          <h1 className="text-lg font-bold text-gray-900">FilmDream</h1>
          <p className="text-xs text-gray-500">Studio</p>
        </div>
      </div>
      
      {/* 导航菜单 */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center px-3 py-2.5 rounded-lg transition-colors group',
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-gray-400 truncate group-hover:text-gray-500">
                    {item.description}
                  </p>
                </div>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-400">
          <p>FilmDream Studio v1.0</p>
          <p>科幻电影创作工作室</p>
        </div>
      </div>
    </aside>
  )
}
