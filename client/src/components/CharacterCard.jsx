import { Edit2, Trash2, Image as ImageIcon, Copy } from 'lucide-react'
import { CHARACTER_TYPES } from '../stores/characterStore'

export default function CharacterCard({ character, onEdit, onDelete, onLinkImages, onViewDetail }) {
  const typeInfo = CHARACTER_TYPES.find(t => t.value === character.type) || CHARACTER_TYPES[4]
  const coverImage = character.images?.find(img => img.id === character.coverImageId) || character.images?.[0]

  const handleCopyPrompt = (e) => {
    e.stopPropagation()
    if (character.promptTemplate) {
      navigator.clipboard.writeText(character.promptTemplate)
    }
  }

  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg transition-all cursor-pointer"
      onClick={() => onViewDetail?.(character)}
    >
      {/* 封面图 */}
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
        {coverImage ? (
          <img
            src={`/uploads/${coverImage.filename}`}
            alt={character.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-50">{typeInfo.icon}</span>
          </div>
        )}
        
        {/* 类型标签 */}
        <span className={`absolute top-3 left-3 px-2.5 py-1 ${typeInfo.color} text-white text-xs font-medium rounded-full`}>
          {typeInfo.icon} {typeInfo.label}
        </span>
        
        {/* 图片数量 */}
        {character.images?.length > 0 && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full flex items-center">
            <ImageIcon className="w-3 h-3 mr-1" />
            {character.images.length}
          </span>
        )}

        {/* 悬浮操作 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(character) }}
              className="p-2.5 bg-white rounded-full shadow-lg hover:bg-gray-100"
              title="编辑"
            >
              <Edit2 className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onLinkImages?.(character) }}
              className="p-2.5 bg-white rounded-full shadow-lg hover:bg-gray-100"
              title="关联图片"
            >
              <ImageIcon className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(character) }}
              className="p-2.5 bg-white rounded-full shadow-lg hover:bg-red-50"
              title="删除"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* 信息区 */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-lg truncate">{character.name}</h3>
        
        {character.height && (
          <p className="text-sm text-gray-500 mt-1">体型: {character.height}</p>
        )}
        
        {/* 能力标签 */}
        {character.abilities?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.abilities.slice(0, 3).map((ability, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {ability}
              </span>
            ))}
            {character.abilities.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                +{character.abilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* 提示词预览 */}
        {character.promptTemplate && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">提示词模板</span>
              <button
                onClick={handleCopyPrompt}
                className="text-gray-400 hover:text-primary-600"
                title="复制提示词"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2 font-mono">
              {character.promptTemplate}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
