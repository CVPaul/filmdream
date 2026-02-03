import { useState, useEffect } from 'react'
import { Plus, Search, Users as UsersIcon, Grid, List } from 'lucide-react'
import useCharacterStore, { CHARACTER_TYPES } from '../stores/characterStore'
import CharacterCard from '../components/CharacterCard'
import CharacterForm from '../components/CharacterForm'
import CharacterDetail from '../components/CharacterDetail'
import ImagePicker from '../components/ImagePicker'

export default function Characters() {
  const { 
    characters, loading, filter, 
    fetchCharacters, deleteCharacter, linkImages, setFilter 
  } = useCharacterStore()
  
  const [showForm, setShowForm] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState(null)
  const [viewingCharacter, setViewingCharacter] = useState(null)
  const [linkingCharacter, setLinkingCharacter] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    fetchCharacters()
  }, [])

  // 处理搜索
  const handleSearch = (value) => {
    setSearchInput(value)
  }

  // 过滤角色
  const filteredCharacters = characters.filter(char => {
    if (searchInput && !char.name.toLowerCase().includes(searchInput.toLowerCase())) {
      return false
    }
    return true
  })

  // 编辑角色
  const handleEdit = (character) => {
    setEditingCharacter(character)
    setShowForm(true)
    setViewingCharacter(null)
  }

  // 删除角色
  const handleDelete = async (character) => {
    if (confirm(`确定要删除角色 "${character.name}" 吗？关联的图片不会被删除。`)) {
      await deleteCharacter(character.id)
    }
  }

  // 关联图片
  const handleLinkImages = (character) => {
    setLinkingCharacter(character)
    setViewingCharacter(null)
  }

  // 确认关联图片
  const handleConfirmLinkImages = async (imageIds) => {
    if (linkingCharacter) {
      await linkImages(linkingCharacter.id, imageIds)
    }
  }

  // 关闭表单
  const handleCloseForm = () => {
    setShowForm(false)
    setEditingCharacter(null)
  }

  // 获取类型统计
  const typeStats = CHARACTER_TYPES.map(type => ({
    ...type,
    count: characters.filter(c => c.type === type.value).length
  }))

  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* 搜索 */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索角色..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 视图切换 */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          
          {/* 创建按钮 */}
          <button 
            onClick={() => { setEditingCharacter(null); setShowForm(true) }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建角色
          </button>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter({ type: 'all' })}
          className={`px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
            filter.type === 'all' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          全部 ({characters.length})
        </button>
        {typeStats.map((type) => (
          <button
            key={type.value}
            onClick={() => setFilter({ type: type.value })}
            className={`flex items-center px-4 py-2 text-sm rounded-lg whitespace-nowrap transition-colors ${
              filter.type === type.value
                ? `${type.color} text-white`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1.5">{type.icon}</span>
            {type.label} ({type.count})
          </button>
        ))}
      </div>

      {/* 角色列表/网格 */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-500">加载中...</p>
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            {characters.length === 0 ? '还没有角色' : '没有匹配的角色'}
          </h3>
          <p className="text-gray-400 mb-4">
            {characters.length === 0 
              ? '创建你的第一个机甲或怪兽角色，开始构建你的科幻世界' 
              : '尝试调整搜索条件'
            }
          </p>
          {characters.length === 0 && (
            <button 
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建角色
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCharacters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLinkImages={handleLinkImages}
              onViewDetail={setViewingCharacter}
            />
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <div className="bg-white rounded-xl border border-gray-200 divide-y">
          {filteredCharacters.map((character) => {
            const typeInfo = CHARACTER_TYPES.find(t => t.value === character.type) || CHARACTER_TYPES[4]
            const coverImage = character.images?.find(img => img.id === character.coverImageId) || character.images?.[0]
            
            return (
              <div 
                key={character.id}
                className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setViewingCharacter(character)}
              >
                {/* 头像 */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4">
                  {coverImage ? (
                    <img
                      src={`/uploads/${coverImage.filename}`}
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      {typeInfo.icon}
                    </div>
                  )}
                </div>
                
                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <h3 className="font-semibold text-gray-900 truncate">{character.name}</h3>
                    <span className={`ml-2 px-2 py-0.5 ${typeInfo.color} text-white text-xs rounded-full`}>
                      {typeInfo.label}
                    </span>
                  </div>
                  {character.height && (
                    <p className="text-sm text-gray-500 mt-0.5">{character.height}</p>
                  )}
                  {character.abilities?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {character.abilities.slice(0, 3).map((ability, idx) => (
                        <span key={idx} className="text-xs text-gray-400">{ability}</span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* 图片数量 */}
                <div className="text-sm text-gray-400 mr-4">
                  {character.images?.length || 0} 张图片
                </div>
                
                {/* 日期 */}
                <div className="text-sm text-gray-400">
                  {new Date(character.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 创建/编辑表单 */}
      {showForm && (
        <CharacterForm
          character={editingCharacter}
          onClose={handleCloseForm}
          onSaved={() => fetchCharacters()}
        />
      )}

      {/* 角色详情 */}
      {viewingCharacter && (
        <CharacterDetail
          character={viewingCharacter}
          onClose={() => setViewingCharacter(null)}
          onEdit={handleEdit}
          onLinkImages={handleLinkImages}
        />
      )}

      {/* 图片选择器 */}
      {linkingCharacter && (
        <ImagePicker
          title={`为 "${linkingCharacter.name}" 选择图片`}
          selectedIds={linkingCharacter.images?.map(img => img.id) || []}
          onConfirm={handleConfirmLinkImages}
          onClose={() => setLinkingCharacter(null)}
        />
      )}
    </div>
  )
}
