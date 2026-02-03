import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Plus, Save, BookOpen, ChevronRight, Trash2, 
  GripVertical, Clock, FileText, AlertCircle
} from 'lucide-react'
import useStoryStore from '../stores/storyStore'
import useCharacterStore from '../stores/characterStore'

export default function Story() {
  const { 
    chapters, currentChapter, loading, saving, hasUnsavedChanges,
    fetchChapters, setCurrentChapter, updateCurrentChapter, 
    createChapter, saveChapter, deleteChapter
  } = useStoryStore()
  
  const { characters, fetchCharacters } = useCharacterStore()
  
  const [showNewChapterInput, setShowNewChapterInput] = useState(false)
  const [newChapterTitle, setNewChapterTitle] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 })
  const editorRef = useRef(null)

  useEffect(() => {
    fetchChapters()
    fetchCharacters()
  }, [])

  // 自动选择第一个章节
  useEffect(() => {
    if (chapters.length > 0 && !currentChapter) {
      setCurrentChapter(chapters[0])
    }
  }, [chapters, currentChapter])

  // 创建新章节
  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) return
    
    await createChapter({
      title: newChapterTitle,
      content: '',
      chapter: chapters.length + 1
    })
    setNewChapterTitle('')
    setShowNewChapterInput(false)
  }

  // 保存当前章节
  const handleSave = async () => {
    if (!currentChapter) return
    await saveChapter(currentChapter.id, {
      title: currentChapter.title,
      content: currentChapter.content
    })
  }

  // 删除章节
  const handleDelete = async (chapter) => {
    if (confirm(`确定要删除章节 "${chapter.title}" 吗？此操作不可撤销。`)) {
      await deleteChapter(chapter.id)
    }
  }

  // 处理内容变化
  const handleContentChange = (e) => {
    const content = e.target.value
    updateCurrentChapter({ content })
    
    // 检测 @ 符号触发角色提及
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = content.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // 如果 @ 后面没有空格，显示提及菜单
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionFilter(textAfterAt)
        setShowMentions(true)
        // 计算位置（简化版本）
        setMentionPosition({ top: 0, left: lastAtIndex * 8 })
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  // 插入角色提及
  const insertMention = (character) => {
    if (!currentChapter || !editorRef.current) return
    
    const textarea = editorRef.current
    const cursorPos = textarea.selectionStart
    const content = currentChapter.content
    const lastAtIndex = content.slice(0, cursorPos).lastIndexOf('@')
    
    const newContent = 
      content.slice(0, lastAtIndex) + 
      `@${character.name} ` + 
      content.slice(cursorPos)
    
    updateCurrentChapter({ content: newContent })
    setShowMentions(false)
    
    // 恢复焦点
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = lastAtIndex + character.name.length + 2
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // 过滤的角色列表
  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(mentionFilter.toLowerCase())
  )

  // 统计字数
  const wordCount = currentChapter?.content?.length || 0

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-6">
      {/* 章节列表 */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          {showNewChapterInput ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
                placeholder="输入章节标题..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateChapter}
                  className="flex-1 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                >
                  创建
                </button>
                <button
                  onClick={() => { setShowNewChapterInput(false); setNewChapterTitle('') }}
                  className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setShowNewChapterInput(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              新建章节
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mx-auto"></div>
            </div>
          ) : chapters.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm px-4">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="mb-1">还没有章节</p>
              <p className="text-xs">创建你的第一个章节开始写作</p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {chapters.map((chapter, index) => (
                <li key={chapter.id}>
                  <button
                    onClick={() => setCurrentChapter(chapter)}
                    className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg group transition-colors ${
                      currentChapter?.id === chapter.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-300 mr-2 opacity-0 group-hover:opacity-100 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-400 mr-2">#{index + 1}</span>
                        <span className="text-sm font-medium truncate">{chapter.title}</span>
                      </div>
                      {chapter.content && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {chapter.content.slice(0, 50)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(chapter) }}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* 章节统计 */}
        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          共 {chapters.length} 章节
        </div>
      </div>

      {/* 编辑区域 */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {currentChapter ? (
          <>
            {/* 工具栏 */}
            <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
              <div className="flex items-center">
                <input
                  type="text"
                  value={currentChapter.title}
                  onChange={(e) => updateCurrentChapter({ title: e.target.value })}
                  placeholder="章节标题..."
                  className="text-lg font-medium text-gray-900 border-none focus:ring-0 p-0 bg-transparent"
                />
                {hasUnsavedChanges && (
                  <span className="ml-3 flex items-center text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    未保存
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="w-4 h-4 mr-1" />
                  {wordCount} 字
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  v{currentChapter.version}
                </div>
                <button 
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
            
            {/* 编辑器 */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="max-w-4xl mx-auto relative">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[70vh]">
                  <textarea
                    ref={editorRef}
                    value={currentChapter.content}
                    onChange={handleContentChange}
                    placeholder={`开始编写你的故事...\n\n提示：\n• 使用 @角色名 可以引用角色档案\n• 内容会自动与场景关联\n• 描述清晰的画面以便后续分镜`}
                    className="w-full h-full min-h-[70vh] p-8 text-gray-800 leading-relaxed resize-none border-none focus:ring-0 rounded-xl text-base"
                  />
                </div>
                
                {/* 角色提及菜单 */}
                {showMentions && filteredCharacters.length > 0 && (
                  <div className="absolute bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 max-h-64 overflow-y-auto w-48"
                    style={{ top: '100px', left: '50px' }}
                  >
                    <p className="px-3 py-1 text-xs text-gray-400">选择角色</p>
                    {filteredCharacters.map(character => (
                      <button
                        key={character.id}
                        onClick={() => insertMention(character)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs mr-2">
                          {character.name[0]}
                        </span>
                        <span className="text-sm text-gray-700">{character.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">选择或创建一个章节</p>
              <p className="text-sm mt-1">开始编写你的科幻故事</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
