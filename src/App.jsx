import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlipHorizontal,
  Import,
  Layers3,
  Play,
  Smartphone,
  Sparkles,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getDraftTitle, parseCopyToCards } from './cardParser.js'
import './App.css'

const DRAFT_KEY = 'teleprompter_draft_v1'
const CARDS_KEY = 'teleprompter_cards_v1'
const ACTIVE_CARD_KEY = 'teleprompter_active_card_v1'
const EXAMPLE_COPY = `### 004｜半天不用全耗在路上

看一次墓地，难道一定要专门空出一整天么？从红谷滩过来，正常路况20多分钟，下高速就是园区。到了以后按预算看就行，4800元的单墓、8800元的合墓，还有一万多到三万多的带碑产品。价格不同，样式也不同，现场一排排看，比电话里问得明白。南昌选墓地，来金安福园比个价。`

const MARKDOWN_COMPONENTS = {
  h1: ({ ...props }) => <h4 {...props} />,
  h2: ({ ...props }) => <h4 {...props} />,
  h3: ({ ...props }) => <h4 {...props} />,
}

const readStoredCards = () => {
  try {
    const storedCards = JSON.parse(localStorage.getItem(CARDS_KEY) ?? '[]')
    if (!Array.isArray(storedCards)) return []

    return storedCards
      .filter((card) => card?.content?.trim())
      .map((card, index) => ({
        id: card.id || `${Date.now()}-${index}`,
        title: card.title || getDraftTitle(card.content),
        content: card.content,
        createdAt: card.createdAt || Date.now(),
      }))
  } catch {
    return []
  }
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
  const [saveStatus, setSaveStatus] = useState('草稿会自动保存在本机')
  const [importedCards, setImportedCards] = useState(readStoredCards)
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
  const textareaRef = useRef(null)

  const draftStats = useMemo(() => {
    const trimmedText = text.trim()
    const characters = trimmedText.replace(/\s/g, '').length
    const estimatedSeconds = Math.max(1, Math.ceil(characters / 4))
    const parsedCount = trimmedText ? parseCopyToCards(trimmedText).length : 0

    return { characters, estimatedSeconds, parsedCount }
  }, [text])

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text)
    } catch {
      // Editing must remain available when browser storage is constrained.
    }
  }, [text])

  useEffect(() => {
    try {
      localStorage.setItem(CARDS_KEY, JSON.stringify(importedCards))
    } catch {
      // Keep in-memory cards usable if persistence is unavailable.
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
      // Active card persistence is a convenience only.
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
      scrollContainer?.addEventListener('scroll', showAndReset)
      timeout = setTimeout(hideControls, 2500)

      return () => {
        window.removeEventListener('mousemove', showAndReset)
        window.removeEventListener('touchstart', showAndReset)
        window.removeEventListener('keydown', showAndReset)
        scrollContainer?.removeEventListener('scroll', showAndReset)
        clearTimeout(timeout)
      }
    }

    return undefined
  }, [isEditing])

  const handleStart = () => {
    if (!text.trim()) {
      setSaveStatus('先粘贴或输入一段文案，再开始提词')
      setEditorTab('editor')
      requestAnimationFrame(() => textareaRef.current?.focus())
      return
    }

    setIsEditing(false)
    setShowControls(true)
    requestAnimationFrame(() => {
      if (containerRef.current) containerRef.current.scrollTop = 0
    })
  }

  const handleExit = () => {
    setIsEditing(true)
    setIsRotated(false)
  }

  const handleClearDraft = () => {
    if (text.trim() && !window.confirm('确定清空当前草稿吗？')) return

    setText('')
    setActiveCardId('')
    try {
      localStorage.removeItem(DRAFT_KEY)
      setSaveStatus('草稿已清空')
    } catch {
      setSaveStatus('草稿已清空，但浏览器存储不可用')
    }
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const handleClearCards = () => {
    if (!hasCards || !window.confirm(`确定清空 ${importedCards.length} 条文案吗？`)) return
    setImportedCards([])
    setActiveCardId('')
    setSaveStatus('文案库已清空')
  }

  const handleTextChange = (event) => {
    const nextText = event.target.value
    setText(nextText)
    if (activeCardId) {
      setImportedCards((cards) =>
        cards.map((card) => (card.id === activeCardId ? { ...card, content: nextText } : card)),
      )
    }
    setSaveStatus(nextText.trim() ? '已自动保存' : '草稿会自动保存在本机')
  }

  const loadCard = useCallback((card, { returnToEditor = true, statusPrefix = '已载入' } = {}) => {
    setActiveCardId(card.id)
    setText(card.content)
    if (returnToEditor) setEditorTab('editor')
    setSaveStatus(`${statusPrefix}「${card.title}」`)
    requestAnimationFrame(() => {
      if (containerRef.current) containerRef.current.scrollTop = 0
    })
  }, [])

  const handleStepCard = useCallback((direction) => {
    if (!canMoveCards) return

    const safeIndex = activeCardIndex >= 0 ? activeCardIndex : direction > 0 ? -1 : 0
    const nextIndex = (safeIndex + direction + importedCards.length) % importedCards.length
    loadCard(importedCards[nextIndex], {
      returnToEditor: false,
      statusPrefix: direction > 0 ? '下一条：' : '上一条：',
    })
    setShowControls(true)
  }, [activeCardIndex, canMoveCards, importedCards, loadCard])

  useEffect(() => {
    if (isEditing) return undefined

    const handleKeyDown = (event) => {
      if (canMoveCards && event.key === 'ArrowRight') {
        event.preventDefault()
        handleStepCard(1)
      }
      if (canMoveCards && event.key === 'ArrowLeft') {
        event.preventDefault()
        handleStepCard(-1)
      }
      if (event.key === 'Escape') handleExit()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canMoveCards, handleStepCard, isEditing])

  const handleBuildCardsFromEditor = () => {
    const cards = parseCopyToCards(text)
    if (cards.length === 0) {
      setSaveStatus('先输入文案，再整理到文案库')
      return
    }

    setImportedCards(cards)
    loadCard(cards[0], { statusPrefix: `已整理 ${cards.length} 条文案，并载入` })
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
      setSaveStatus('请选择 MD、Markdown 或 TXT 文本文件')
      event.target.value = ''
      return
    }

    try {
      const cards = parseCopyToCards(await file.text())
      if (cards.length === 0) {
        setSaveStatus('导入失败：文件内容为空')
        return
      }
      setImportedCards(cards)
      loadCard(cards[0], { returnToEditor: false, statusPrefix: `已导入 ${cards.length} 条文案，并载入` })
      setEditorTab('cards')
    } catch {
      setSaveStatus('导入失败，请重试')
    } finally {
      event.target.value = ''
    }
  }

  const handleUseExample = () => {
    setActiveCardId('')
    setText(EXAMPLE_COPY)
    setEditorTab('editor')
    setSaveStatus('示例已填入，可直接编辑或整理成文案')
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  return (
    <div className="app">
      {isEditing ? (
        <main className="editor-layout">
          <header className="app-header">
            <div className="brand">
              <span className="brand-mark"><FileText size={22} /></span>
              <div>
                <h1>简明提词器</h1>
                <p>粘贴文案，马上开拍</p>
              </div>
            </div>
            <div className="header-actions">
              <input
                ref={markdownInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/plain,text/markdown,*/*"
                className="hidden-file-input"
                onChange={handleImportMarkdown}
              />
              <button type="button" className="button button-secondary" onClick={() => markdownInputRef.current?.click()} aria-label="导入文件">
                <Import size={17} /> <span>导入文件</span>
              </button>
              <button type="button" className="button button-quiet" onClick={handleClearDraft} disabled={!text} aria-label="清空草稿">
                <Trash2 size={17} /> <span>清空</span>
              </button>
            </div>
          </header>

          <nav className="editor-tabs" aria-label="提词器页面">
            <button
              type="button"
              className={`tab-button ${editorTab === 'editor' ? 'tab-button-active' : ''}`}
              onClick={() => setEditorTab('editor')}
            >
              <FileText size={17} /> 写文案
            </button>
            <button
              type="button"
              className={`tab-button ${editorTab === 'cards' ? 'tab-button-active' : ''}`}
              onClick={() => setEditorTab('cards')}
            >
              <Layers3 size={17} /> 文案库
              {hasCards && <span className="tab-count">{importedCards.length}</span>}
            </button>
          </nav>

          {editorTab === 'editor' ? (
            <div className="editor-workspace">
              <section className="surface composer-card">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">当前草稿</span>
                    <h2>{activeCard?.title ?? '输入你的口播文案'}</h2>
                  </div>
                  <span className="saved-state"><Check size={15} /> {saveStatus}</span>
                </div>

                <textarea
                  ref={textareaRef}
                  className="editor-textarea"
                  aria-label="提词文案"
                  placeholder={'粘贴或输入文案…\n\n支持：004｜文案标题\n也支持：### 004｜文案标题'}
                  value={text}
                  onChange={handleTextChange}
                  spellCheck="false"
                />

                <div className="composer-footer">
                  <div className="draft-meta" aria-label="文案统计">
                    <span>{draftStats.characters} 字</span>
                    <i />
                    <span>约 {draftStats.estimatedSeconds} 秒</span>
                    <i />
                    <span>可整理为 {draftStats.parsedCount} 条</span>
                  </div>
                  <button
                    type="button"
                    className="button button-secondary organize-button"
                    onClick={handleBuildCardsFromEditor}
                    disabled={!text.trim()}
                  >
                    <Sparkles size={17} /> 整理到文案库
                  </button>
                </div>
              </section>

              <aside className="editor-sidebar">
                <section className="surface start-card">
                  <span className="eyebrow">准备好了</span>
                  <h2>开始顺畅提词</h2>
                  <p>进入全屏后可调字号、镜像和横屏，左右方向键切换文案。</p>
                  <button type="button" onClick={handleStart} className="start-button">
                    <Play size={20} fill="currentColor" /> 开始提词
                  </button>
                </section>

                {hasCards && (
                  <section className="surface current-card-panel">
                    <div className="current-card-copy">
                      <span className="eyebrow">文案库</span>
                      <strong>{activeCard?.title ?? '尚未选择文案'}</strong>
                    </div>
                    <div className="card-switcher">
                      <button type="button" className="round-button" onClick={() => handleStepCard(-1)} disabled={!canMoveCards} aria-label="上一条文案">
                        <ChevronLeft size={19} />
                      </button>
                      <span>{activeCardIndex >= 0 ? activeCardIndex + 1 : 0} / {importedCards.length}</span>
                      <button type="button" className="round-button" onClick={() => handleStepCard(1)} disabled={!canMoveCards} aria-label="下一条文案">
                        <ChevronRight size={19} />
                      </button>
                    </div>
                  </section>
                )}

                <section className="surface format-card">
                  <div className="format-heading">
                    <div>
                      <span className="eyebrow">支持你的格式</span>
                      <h3>编号标题会自动识别</h3>
                    </div>
                    <span className="format-badge">新</span>
                  </div>
                  <pre>### 004｜半天不用全耗在路上{`\n\n`}正文从这里开始…</pre>
                  <p>连续粘贴多篇编号文案，也能自动拆分；原有的 <code># 标题</code> 和 <code>---</code> 分隔仍然支持。</p>
                  <button type="button" className="text-button" onClick={handleUseExample}>填入示例看看 <ChevronRight size={16} /></button>
                </section>
              </aside>
            </div>
          ) : (
            <section className="surface library-page">
              <div className="library-header">
                <div>
                  <span className="eyebrow">文案库</span>
                  <h2>{importedCards.length ? `${importedCards.length} 条可提词文案` : '还没有整理文案'}</h2>
                  <p>点击任意文案即可载入编辑，也可以直接开始提词。</p>
                </div>
                <div className="library-actions">
                  <button type="button" className="button button-secondary" onClick={() => markdownInputRef.current?.click()}>
                    <Import size={17} /> 导入文件
                  </button>
                  {hasCards && (
                    <button type="button" className="button button-quiet danger-button" onClick={handleClearCards}>
                      <Trash2 size={17} /> 清空文案库
                    </button>
                  )}
                </div>
              </div>

              <div className="card-list">
                {!hasCards ? (
                  <div className="card-empty">
                    <span><Layers3 size={26} /></span>
                    <strong>从一段文案开始</strong>
                    <p>回到“写文案”粘贴内容，再点“整理到文案库”。</p>
                    <button type="button" className="button button-primary" onClick={() => setEditorTab('editor')}>去写文案</button>
                  </div>
                ) : (
                  importedCards.map((card, index) => (
                    <button
                      key={card.id}
                      type="button"
                      className={`card-item ${activeCardId === card.id ? 'card-item-active' : ''}`}
                      onClick={() => loadCard(card)}
                    >
                      <span className="card-number">{String(index + 1).padStart(2, '0')}</span>
                      <div className="card-item-body">
                        <strong className="card-title">{card.title}</strong>
                        <div className="card-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                            {card.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <ChevronRight className="card-chevron" size={20} />
                    </button>
                  ))
                )}
              </div>

              {hasCards && (
                <div className="library-footer">
                  <span>{activeCard ? `已选：${activeCard.title}` : '选择一条文案开始'}</span>
                  <button type="button" onClick={handleStart} className="start-button start-button-inline">
                    <Play size={19} fill="currentColor" /> 开始提词
                  </button>
                </div>
              )}
            </section>
          )}
        </main>
      ) : (
        <div className="teleprompter-shell">
          <div className={`teleprompter-stage ${isRotated ? 'force-landscape' : ''}`}>
            <div
              className={`controls-bar ${showControls ? 'controls-visible' : 'controls-hidden'}`}
              style={{ paddingInline: isRotated ? '3rem' : '1rem' }}
            >
              <div className="controls-inner">
                <div className="tele-control-pill" aria-label="字号">
                  <button type="button" onClick={() => setFontSize((size) => Math.max(20, size - 4))} className="icon-button" aria-label="缩小字体">
                    <ZoomOut size={23} />
                  </button>
                  <span className="font-size-readout">{fontSize}</span>
                  <button type="button" onClick={() => setFontSize((size) => Math.min(250, size + 4))} className="icon-button" aria-label="放大字体">
                    <ZoomIn size={23} />
                  </button>
                </div>

                <div className="actions-group">
                  {hasCards && (
                    <div className="tele-card-switcher" aria-label="文案切换">
                      <button type="button" onClick={() => handleStepCard(-1)} className="icon-button" aria-label="上一条文案" disabled={!canMoveCards}>
                        <ChevronLeft size={23} />
                      </button>
                      <span className="tele-card-readout">
                        <strong>{activeCardIndex >= 0 ? activeCardIndex + 1 : 0}/{importedCards.length}</strong>
                        <small>{activeCard?.title ?? '当前草稿'}</small>
                      </span>
                      <button type="button" onClick={() => handleStepCard(1)} className="icon-button" aria-label="下一条文案" disabled={!canMoveCards}>
                        <ChevronRight size={23} />
                      </button>
                    </div>
                  )}

                  <button type="button" onClick={() => setIsRotated(!isRotated)} className={`state-button ${isRotated ? 'state-button-active' : ''}`} aria-label="切换横竖屏">
                    <Smartphone size={22} className={isRotated ? '' : 'rotated-90'} />
                  </button>
                  <button type="button" onClick={() => setIsMirrored(!isMirrored)} className={`state-button ${isMirrored ? 'state-button-active' : ''}`} aria-label="镜像反转">
                    <FlipHorizontal size={22} />
                  </button>
                  <button type="button" onClick={handleExit} className="exit-button" aria-label="退出提词">
                    <X size={23} />
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
                  maxWidth: isRotated ? 'none' : '900px',
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
