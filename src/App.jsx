import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Edit2,
  FlipHorizontal,
  Play,
  Smartphone,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const DRAFT_KEY = 'teleprompter_draft_v1'
const CARDS_KEY = 'teleprompter_cards_v1'
const ACTIVE_CARD_KEY = 'teleprompter_active_card_v1'
const CARD_LIMIT = 50
const MD_FORMAT_GUIDE = `# 卡片标题1
这里是第一段提词内容。
可以多行。

---

# 卡片标题2
这里是第二段提词内容。

---

没有标题也可以，系统会用首行自动生成标题。`

const MARKDOWN_COMPONENTS = {
  h1: ({ ...props }) => <h4 {...props} />,
  h2: ({ ...props }) => <h4 {...props} />,
  h3: ({ ...props }) => <h4 {...props} />,
}

const createCardId = (index) => `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`

const getDraftTitle = (content) => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (!firstLine) return '未命名草稿'
  return firstLine.slice(0, 24)
}

const parseMarkdownToCards = (rawMarkdown) => {
  const normalized = rawMarkdown.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  return normalized
    .split(/\n-{3,}\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block.split('\n')
      const firstLine = lines[0]?.trim() ?? ''
      const hasMarkdownTitle = firstLine.startsWith('# ')
      const title = hasMarkdownTitle ? firstLine.slice(2).trim() || `卡片${index + 1}` : getDraftTitle(block)
      const content = hasMarkdownTitle ? lines.slice(1).join('\n').trim() : block
      return {
        id: createCardId(index),
        title,
        content: content || block,
        createdAt: Date.now(),
      }
    })
    .filter((card) => card.content.trim())
    .slice(0, CARD_LIMIT)
}

function App() {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [isEditing, setIsEditing] = useState(true)
  const [fontSize, setFontSize] = useState(72)
  const [isMirrored, setIsMirrored] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isRotated, setIsRotated] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [importedCards, setImportedCards] = useState(() => {
    try {
      const storedCards = JSON.parse(localStorage.getItem(CARDS_KEY) ?? '[]')
      if (!Array.isArray(storedCards)) return []

      return storedCards
        .filter((card) => card?.content?.trim())
        .map((card, index) => ({
          id: card.id || createCardId(index),
          title: card.title || getDraftTitle(card.content),
          content: card.content,
          createdAt: card.createdAt || Date.now(),
        }))
        .slice(0, CARD_LIMIT)
    } catch {
      return []
    }
  })
  const [activeCardId, setActiveCardId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_CARD_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [editorTab, setEditorTab] = useState('editor')
  const containerRef = useRef(null)
  const markdownInputRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text)
    } catch {
      // localStorage can be unavailable in private browsing or constrained webviews.
    }
  }, [text])

  useEffect(() => {
    try {
      localStorage.setItem(CARDS_KEY, JSON.stringify(importedCards))
    } catch {
      // Keep the in-memory cards usable even if persistence fails.
    }
  }, [importedCards])

  useEffect(() => {
    try {
      if (activeCardId) {
        localStorage.setItem(ACTIVE_CARD_KEY, activeCardId)
      } else {
        localStorage.removeItem(ACTIVE_CARD_KEY)
      }
    } catch {
      // Current card persistence is a convenience, so failure should not block use.
    }
  }, [activeCardId])

  const activeCardIndex = importedCards.findIndex((card) => card.id === activeCardId)
  const activeCard = activeCardIndex >= 0 ? importedCards[activeCardIndex] : null
  const hasCards = importedCards.length > 0
  const canMoveCards = importedCards.length > 1

  useEffect(() => {
    let timeout

    if (!isEditing) {
      const hideControls = () => setShowControls(false)
      const showAndReset = () => {
        setShowControls(true)
        clearTimeout(timeout)
        timeout = setTimeout(hideControls, 2500)
      }

      const scrollContainer = containerRef.current

      window.addEventListener('mousemove', showAndReset)
      window.addEventListener('touchstart', showAndReset)
      window.addEventListener('keydown', showAndReset)

      if (scrollContainer) {
        scrollContainer.addEventListener('scroll', showAndReset)
      }

      timeout = setTimeout(hideControls, 2500)

      return () => {
        window.removeEventListener('mousemove', showAndReset)
        window.removeEventListener('touchstart', showAndReset)
        window.removeEventListener('keydown', showAndReset)
        if (scrollContainer) {
          scrollContainer.removeEventListener('scroll', showAndReset)
        }
        clearTimeout(timeout)
      }
    }
    return undefined
  }, [isEditing])

  const handleStart = () => {
    if (!text.trim()) {
      alert('请先输入或粘贴一些文字')
      return
    }
    setIsEditing(false)
    setShowControls(true)
  }

  const handleExit = () => {
    setIsEditing(true)
    setIsRotated(false)
  }

  const handleClearDraft = () => {
    setText('')
    try {
      localStorage.removeItem(DRAFT_KEY)
      setSaveStatus('草稿已清空')
    } catch {
      setSaveStatus('清空失败：浏览器存储不可用')
    }
  }

  const handleTextChange = (event) => {
    const nextText = event.target.value
    setText(nextText)
    if (activeCardId) {
      setImportedCards((cards) =>
        cards.map((card) => (card.id === activeCardId ? { ...card, content: nextText } : card)),
      )
    }
    setSaveStatus(nextText.trim() ? '草稿已自动保存' : '')
  }

  const loadCard = useCallback((card, { returnToEditor = true, statusPrefix = '已载入卡片' } = {}) => {
    setActiveCardId(card.id)
    setText(card.content)
    if (returnToEditor) {
      setEditorTab('editor')
    }
    setSaveStatus(`${statusPrefix}：${card.title}`)
    requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0
      }
    })
  }, [])

  const handleStepCard = useCallback((direction) => {
    if (!canMoveCards) return

    const safeIndex = activeCardIndex >= 0 ? activeCardIndex : direction > 0 ? -1 : 0
    const nextIndex = (safeIndex + direction + importedCards.length) % importedCards.length
    loadCard(importedCards[nextIndex], {
      returnToEditor: false,
      statusPrefix: direction > 0 ? '已切到下一条' : '已切到上一条',
    })
    setShowControls(true)
  }, [activeCardIndex, canMoveCards, importedCards, loadCard])

  useEffect(() => {
    if (isEditing || !canMoveCards) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        handleStepCard(1)
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        handleStepCard(-1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canMoveCards, handleStepCard, isEditing])

  const handlePickMarkdown = () => {
    markdownInputRef.current?.click()
  }

  const handleBuildCardsFromEditor = () => {
    const cards = parseMarkdownToCards(text)
    if (cards.length === 0) {
      setSaveStatus('请先输入可拆分的文案内容')
      return
    }

    setImportedCards(cards)
    loadCard(cards[0], { statusPrefix: `已生成 ${cards.length} 条文案，已载入` })
  }

  const handleImportMarkdown = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const fileType = (file.type || '').toLowerCase()
    const isSupported =
      fileName.endsWith('.md') ||
      fileName.endsWith('.markdown') ||
      fileName.endsWith('.txt') ||
      fileType.includes('markdown') ||
      fileType === 'text/plain' ||
      fileType === ''

    if (!isSupported) {
      setSaveStatus('请选择 md/markdown/txt 文本文件')
      event.target.value = ''
      return
    }

    try {
      const markdownText = await file.text()
      const cards = parseMarkdownToCards(markdownText)
      if (cards.length === 0) {
        setSaveStatus('导入失败：内容为空或格式无效')
        event.target.value = ''
        return
      }
      setImportedCards(cards)
      loadCard(cards[0], { returnToEditor: false, statusPrefix: `导入成功：${cards.length} 张卡片，已载入` })
      setEditorTab('cards')
    } catch {
      setSaveStatus('导入失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  const handleLoadCard = (card) => {
    loadCard(card)
  }

  return (
    <div className="app">
      {isEditing ? (
        <div className="editor-layout">
          <div className="editor-header">
            <h1 className="editor-title">
              <Edit2 size={24} /> 提词器文本编辑
            </h1>
            <div className="header-actions">
              <input
                ref={markdownInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/plain,text/markdown,*/*"
                className="hidden-file-input"
                onChange={handleImportMarkdown}
              />
              <button type="button" className="ghost-button" onClick={handlePickMarkdown}>
                导入 MD
              </button>
              <button type="button" className="ghost-button" onClick={handleBuildCardsFromEditor}>
                拆分文案
              </button>
              <button type="button" className="ghost-button" onClick={handleClearDraft}>
                清空草稿
              </button>
            </div>
          </div>
          <div className="editor-tabs">
            <button
              type="button"
              className={`tab-button ${editorTab === 'editor' ? 'tab-button-active' : ''}`}
              onClick={() => setEditorTab('editor')}
            >
              编辑页
            </button>
            <button
              type="button"
              className={`tab-button ${editorTab === 'cards' ? 'tab-button-active' : ''}`}
              onClick={() => setEditorTab('cards')}
            >
              导入卡片页
            </button>
          </div>

          {editorTab === 'editor' ? (
            <>
              <div className="editor-body">
                <textarea
                  className="editor-textarea"
                  placeholder={
                    '请在此粘贴或输入您的提词文本...\n\n进入提词模式后，可通过右上角按钮强制横屏显示，横屏时文字会自动铺满屏幕。'
                  }
                  value={text}
                  onChange={handleTextChange}
                />
              </div>
              {saveStatus && <p className="save-status">{saveStatus}</p>}
              {hasCards && (
                <div className="active-card-panel">
                  <div>
                    <span>当前文案</span>
                    <strong>{activeCard?.title ?? '未选择文案'}</strong>
                  </div>
                  <div className="card-switcher">
                    <button
                      type="button"
                      className="ghost-button compact-button"
                      onClick={() => handleStepCard(-1)}
                      disabled={!canMoveCards}
                    >
                      <ChevronLeft size={18} /> 上一条
                    </button>
                    <span>{activeCardIndex >= 0 ? activeCardIndex + 1 : 0} / {importedCards.length}</span>
                    <button
                      type="button"
                      className="ghost-button compact-button"
                      onClick={() => handleStepCard(1)}
                      disabled={!canMoveCards}
                    >
                      下一条 <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
              <div className="md-guide">
                <strong className="md-guide-title">MD 格式说明（--- 分隔卡片）</strong>
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                  {MD_FORMAT_GUIDE}
                </ReactMarkdown>
              </div>
            </>
          ) : (
            <>
              <div className="card-header">
                <strong>导入卡片</strong>
                <span>{importedCards.length} / {CARD_LIMIT}</span>
              </div>
              <div className="card-page-actions">
                <button type="button" className="ghost-button" onClick={() => setEditorTab('editor')}>
                  返回编辑页
                </button>
              </div>
              <div className="card-list card-page-list">
                {importedCards.length === 0 ? (
                  <p className="card-empty">还没有导入卡片，点击“导入 MD”开始。</p>
                ) : (
                  importedCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`card-item ${activeCardId === card.id ? 'card-item-active' : ''}`}
                      onClick={() => handleLoadCard(card)}
                    >
                      <strong className="card-title">{card.title}</strong>
                      <span>{new Date(card.createdAt).toLocaleString()}</span>
                      <div className="card-markdown">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                          {card.content}
                        </ReactMarkdown>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}

          <button onClick={handleStart} className="start-button">
            <Play size={24} fill="currentColor" /> 开始提词
          </button>
        </div>
      ) : (
        <div className="teleprompter-shell">
          <div
            className={`teleprompter-stage ${isRotated ? 'force-landscape' : ''}`}
          >
            <div
              className={`controls-bar ${showControls ? 'controls-visible' : 'controls-hidden'}`}
              style={{ paddingInline: isRotated ? '3rem' : '1rem' }}
            >
              <div className="controls-inner">
                <div className="pill-group">
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.max(20, f - 4))}
                    className="icon-button"
                    title="缩小字体"
                  >
                    <ZoomOut size={24} />
                  </button>
                  <span className="font-size-readout">{fontSize}</span>
                  <button
                    type="button"
                    onClick={() => setFontSize((f) => Math.min(250, f + 4))}
                    className="icon-button"
                    title="放大字体"
                  >
                    <ZoomIn size={24} />
                  </button>
                </div>

                <div className="actions-group">
                  {hasCards && (
                    <div className="tele-card-switcher" aria-label="文案切换">
                      <button
                        type="button"
                        onClick={() => handleStepCard(-1)}
                        className="icon-button"
                        title="上一条文案"
                        disabled={!canMoveCards}
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <span className="tele-card-readout">
                        <strong>{activeCardIndex >= 0 ? activeCardIndex + 1 : 0}/{importedCards.length}</strong>
                        <small>{activeCard?.title ?? '未选择文案'}</small>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStepCard(1)}
                        className="icon-button"
                        title="下一条文案"
                        disabled={!canMoveCards}
                      >
                        <ChevronRight size={24} />
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsRotated(!isRotated)}
                    className={`state-button ${isRotated ? 'active-green' : ''}`}
                    title="强制横屏/竖屏"
                  >
                    <Smartphone size={24} className={isRotated ? '' : 'rotated-90'} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMirrored(!isMirrored)}
                    className={`state-button ${isMirrored ? 'active-blue' : ''}`}
                    title="镜像反转"
                  >
                    <FlipHorizontal size={24} />
                  </button>

                  <button type="button" onClick={handleExit} className="exit-button" title="退出提词">
                    <X size={24} />
                  </button>
                </div>
              </div>
            </div>

            <div
              ref={containerRef}
              className="teleprompter-scroll"
              style={{ paddingTop: isRotated ? '20vw' : '30vh', paddingBottom: isRotated ? '36vw' : '50vh' }}
            >
              <div
                className="teleprompter-text"
                style={{
                  fontSize: `${fontSize}px`,
                  transform: isMirrored ? 'scaleX(-1)' : 'none',
                  width: isRotated ? '95%' : '90%',
                  maxWidth: isRotated ? 'none' : '800px',
                }}
              >
                {text}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
