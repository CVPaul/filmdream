import { useState } from 'react'
import { X, Edit2, Image as ImageIcon, Copy, Check, Star, Trash2 } from 'lucide-react'
import { CHARACTER_TYPES } from '../stores/characterStore'
import useCharacterStore from '../stores/characterStore'

export default function CharacterDetail({ character, onClose, onEdit, onLinkImages }) {
  const { updateCharacter } = useCharacterStore()
  const [copied, setCopied] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  
  if (!character) return null
  
  const typeInfo = CHARACTER_TYPES.find(t => t.value === character.type) || CHARACTER_TYPES[4]
  const images = character.images || []
  const currentImage = images[selectedImageIndex]

  const handleCopyPrompt = () => {
    if (character.promptTemplate) {
      navigator.clipboard.writeText(character.promptTemplate)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSetCover = async (imageId) => {
    await updateCharacter(character.id, { coverImageId: imageId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex"
        onClick={e => e.stopPropagation()}
      >
        {/* 左侧：图片展示 */}
        <div className="w-1/2 bg-gray-900 flex flex-col">
          {/* 主图 */}
          <div className="flex-1 flex items-center justify-center p-6 min-h-0">
            {currentImage ? (
              <img
                src={`/uploads/${currentImage.filename}`}
                alt={character.name}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-500">
                <span className="text-8xl mb-4">{typeInfo.icon}</span>
                <p className="text-gray-400">暂无图片</p>
                <button
                  onClick={() => onLinkImages?.(character)}
                  className="mt-4 flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  添加图片
                </button>
              </div>
            )}
          </div>
          
          {/* 缩略图列表 */}
          {images.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all ${
                      idx === selectedImageIndex ? 'border-primary-500' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={`/uploads/${img.filename}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {img.id === character.coverImageId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => onLinkImages?.(character)}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-300 flex-shrink-0"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </div>
              {currentImage && currentImage.id !== character.coverImageId && (
                <button
                  onClick={() => handleSetCover(currentImage.id)}
                  className="mt-2 text-xs text-gray-400 hover:text-white flex items-center"
                >
                  <Star className="w-3 h-3 mr-1" />
                  设为封面
                </button>
              )}
            </div>
          )}
        </div>

        {/* 右侧：角色信息 */}
        <div className="w-1/2 flex flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center">
              <span className={`px-2.5 py-1 ${typeInfo.color} text-white text-xs font-medium rounded-full mr-3`}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              <h2 className="text-xl font-semibold text-gray-900">{character.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onEdit?.(character)}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* 内容 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 基本信息 */}
            {character.height && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">体型/高度</h4>
                <p className="text-gray-900">{character.height}</p>
              </div>
            )}

            {/* 能力 */}
            {character.abilities?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">特殊能力</h4>
                <div className="flex flex-wrap gap-2">
                  {character.abilities.map((ability, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-sm"
                    >
                      {ability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 弱点 */}
            {character.weaknesses && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">弱点</h4>
                <p className="text-gray-900">{character.weaknesses}</p>
              </div>
            )}

            {/* 背景故事 */}
            {character.backstory && (
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">背景故事</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{character.backstory}</p>
              </div>
            )}

            {/* 提示词模板 */}
            {character.promptTemplate && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-500">提示词模板</h4>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        复制
                      </>
                    )}
                  </button>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap">
                    {character.promptTemplate}
                  </p>
                </div>
              </div>
            )}

            {/* 关联图片统计 */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>关联图片: {images.length} 张</span>
                <span>创建于: {new Date(character.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
