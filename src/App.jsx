import { useEffect, useRef, useState } from 'react'
import { Edit2, FlipHorizontal, Play, Smartphone, X, ZoomIn, ZoomOut } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './App.css'

const DRAFT_KEY = 'teleprompter_draft_v1'
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
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
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
  const [importedCards, setImportedCards] = useState([])
  const [activeCardId, setActiveCardId] = useState('')
  const containerRef = useRef(null)
  const markdownInputRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text)
      if (text.trim()) {
        setSaveStatus('草稿已自动保存')
      } else {
        setSaveStatus('')
      }
    } catch {
      setSaveStatus('保存失败：浏览器存储不可用')
    }
  }, [text])

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

  const handlePickMarkdown = () => {
    markdownInputRef.current?.click()
  }

  const handleImportMarkdown = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.md')) {
      setSaveStatus('请选择 .md 文件')
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
      setActiveCardId(cards[0].id)
      setText(cards[0].content)
      setSaveStatus(`导入成功：${cards.length} 张卡片`)
    } catch {
      setSaveStatus('导入失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  const handleLoadCard = (card) => {
    setActiveCardId(card.id)
    setText(card.content)
    setSaveStatus(`已载入卡片：${card.title}`)
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
                accept=".md,text/markdown"
                className="hidden-file-input"
                onChange={handleImportMarkdown}
              />
              <button type="button" className="ghost-button" onClick={handlePickMarkdown}>
                导入 MD
              </button>
              <button type="button" className="ghost-button" onClick={handleClearDraft}>
                清空草稿
              </button>
            </div>
          </div>

          <div className="editor-body">
            <textarea
              className="editor-textarea"
              placeholder={
                '请在此粘贴或输入您的提词文本...\n\n进入提词模式后，可通过右上角按钮强制横屏显示，横屏时文字会自动铺满屏幕。'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          {saveStatus && <p className="save-status">{saveStatus}</p>}
          <div className="md-guide">
            <strong className="md-guide-title">MD 格式说明（--- 分隔卡片）</strong>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
              {MD_FORMAT_GUIDE}
            </ReactMarkdown>
          </div>

          <div className="card-header">
            <strong>导入卡片</strong>
            <span>{importedCards.length} / {CARD_LIMIT}</span>
          </div>
          <div className="card-list">
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
