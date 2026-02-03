import { useState, useEffect } from 'react'
import { Image, Users, BookOpen, Map, Film, ArrowRight, Loader2, Sparkles, Clapperboard, Palette, Mic } from 'lucide-react'
import { Link } from 'react-router-dom'

const API_BASE = 'http://localhost:3001/api'

const statConfig = [
  { key: 'images', label: '图片素材', icon: Image, path: '/gallery', color: 'bg-blue-500' },
  { key: 'characters', label: '角色档案', icon: Users, path: '/characters', color: 'bg-green-500' },
  { key: 'stories', label: '故事章节', icon: BookOpen, path: '/story', color: 'bg-purple-500' },
  { key: 'scenes', label: '场景数量', icon: Map, path: '/scenes', color: 'bg-orange-500' },
  { key: 'shots', label: '分镜镜头', icon: Film, path: '/timeline', color: 'bg-red-500' },
  { key: 'voiceovers', label: '配音台词', icon: Mic, path: '/voiceover', color: 'bg-pink-500' },
]

const quickActions = [
  { label: '上传图片', description: '添加AI生成的机甲或怪兽图片', path: '/gallery', icon: Image },
  { label: '创建角色', description: '为机甲或怪兽建立档案', path: '/characters', icon: Users },
  { label: '编写故事', description: '开始撰写剧本和故事大纲', path: '/story', icon: BookOpen },
  { label: '规划场景', description: '设计战斗场景和环境', path: '/scenes', icon: Map },
]

const features = [
  { 
    title: '城市战斗预设', 
    description: '一键创建从写字楼望向巨型机甲和怪兽的经典镜头', 
    path: '/compositor',
    icon: Sparkles,
    color: 'text-yellow-500'
  },
  { 
    title: 'ComfyUI导出', 
    description: '生成AnimateDiff/SVD/CogVideoX工作流', 
    path: '/export',
    icon: Clapperboard,
    color: 'text-blue-500'
  },
  { 
    title: '剪辑技巧库', 
    description: '学习专业镜头语言和科幻特效', 
    path: '/techniques',
    icon: Palette,
    color: 'text-purple-500'
  },
]

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [recentItems, setRecentItems] = useState({ characters: [], scenes: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        // 并行获取统计数据和最近内容
        const [statsRes, charactersRes, scenesRes] = await Promise.all([
          fetch(`${API_BASE}/stats`),
          fetch(`${API_BASE}/characters`),
          fetch(`${API_BASE}/scenes`)
        ])
        
        if (!statsRes.ok) throw new Error('无法获取统计数据')
        
        const statsData = await statsRes.json()
        setStats(statsData)
        
        // 获取最近的角色和场景
        if (charactersRes.ok) {
          const characters = await charactersRes.json()
          setRecentItems(prev => ({ 
            ...prev, 
            characters: characters.slice(0, 3) 
          }))
        }
        
        if (scenesRes.ok) {
          const scenes = await scenesRes.json()
          setRecentItems(prev => ({ 
            ...prev, 
            scenes: scenes.slice(0, 3) 
          }))
        }
        
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const hasContent = stats && (stats.images > 0 || stats.characters > 0 || stats.scenes > 0)

  return (
    <div className="space-y-8">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">欢迎来到 FilmDream Studio</h1>
        <p className="text-primary-100 text-lg">
          你的科幻电影创作工作室 - 从AI图片到完整视频的全流程管理平台
        </p>
        <div className="mt-6 flex space-x-4">
          <Link 
            to="/gallery" 
            className="px-6 py-2 bg-white text-primary-700 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            开始创作
          </Link>
          <Link 
            to="/techniques" 
            className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-400 transition-colors"
          >
            学习技巧
          </Link>
        </div>
      </div>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-6 gap-4">
        {statConfig.map((stat) => (
          <Link
            key={stat.key}
            to={stat.path}
            className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            {loading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <p className="text-2xl font-bold text-gray-300">-</p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{stats?.[stat.key] || 0}</p>
            )}
            <p className="text-sm text-gray-500">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* 特色功能 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">特色功能</h3>
        <div className="grid grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.title}
              to={feature.path}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <div className="flex items-start space-x-3">
                <feature.icon className={`w-6 h-6 ${feature.color} flex-shrink-0`} />
                <div>
                  <h4 className="font-medium text-gray-900 group-hover:text-primary-600">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* 快速操作 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">快速开始</h3>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:shadow-md hover:border-primary-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <action.icon className="w-5 h-5 text-gray-400 group-hover:text-primary-500" />
                  <div>
                    <h4 className="font-medium text-gray-900 group-hover:text-primary-600">
                      {action.label}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近活动 */}
      {hasContent && (
        <div className="grid grid-cols-2 gap-6">
          {/* 最近角色 */}
          {recentItems.characters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">最近角色</h3>
                <Link to="/characters" className="text-sm text-primary-600 hover:text-primary-700">
                  查看全部
                </Link>
              </div>
              <div className="space-y-2">
                {recentItems.characters.map((char) => (
                  <Link
                    key={char.id}
                    to="/characters"
                    className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        char.type === 'mecha' ? 'bg-blue-100 text-blue-600' :
                        char.type === 'kaiju' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{char.name}</p>
                        <p className="text-xs text-gray-500">
                          {char.type === 'mecha' ? '机甲' : 
                           char.type === 'kaiju' ? '怪兽' : 
                           char.type === 'human' ? '人物' : '其他'}
                          {char.height && ` · ${char.height}米`}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 最近场景 */}
          {recentItems.scenes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">最近场景</h3>
                <Link to="/scenes" className="text-sm text-primary-600 hover:text-primary-700">
                  查看全部
                </Link>
              </div>
              <div className="space-y-2">
                {recentItems.scenes.map((scene) => (
                  <Link
                    key={scene.id}
                    to="/scenes"
                    className="block bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                        <Map className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{scene.name}</p>
                        <p className="text-xs text-gray-500">
                          {scene.environment} · {scene.timeOfDay} · {scene.weather}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 工作流程 */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">创作流程</h3>
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">上传AI图片</h4>
                <p className="text-sm text-gray-500">收集机甲/怪兽设计图</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">建立角色档案</h4>
                <p className="text-sm text-gray-500">确定形象和设定</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">编写故事</h4>
                <p className="text-sm text-gray-500">围绕角色展开剧情</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-300" />
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-bold">4</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">导出制作</h4>
                <p className="text-sm text-gray-500">生成ComfyUI工作流</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
