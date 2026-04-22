import { useEffect, useRef, useState } from 'react'
import { Edit2, FlipHorizontal, Play, Smartphone, X, ZoomIn, ZoomOut } from 'lucide-react'
import './App.css'

const DRAFT_KEY = 'teleprompter_draft_v1'
const HISTORY_KEY = 'teleprompter_recent_40_v1'
const MAX_HISTORY = 40
const TEMPLATE_TEXT = `【开场】
大家好，今天给大家分享一个重点内容。

【第一部分：背景】
先说结论：这一点非常关键，建议先记下来。

【第二部分：核心要点】
第一，要明确目标。
第二，要拆分步骤。
第三，要持续复盘优化。

【第三部分：行动建议】
今天就先完成第一步，别追求一步到位。

【结尾】
如果这段内容对你有帮助，记得收藏，方便后续复盘。`

const getHistoryFromStorage = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getDraftTitle = (content) => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)
  if (!firstLine) return '未命名草稿'
  return firstLine.slice(0, 24)
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
  const [recentDrafts, setRecentDrafts] = useState(() => getHistoryFromStorage())
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
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(recentDrafts))
    } catch {
      // Ignore storage errors to avoid blocking editing.
    }
  }, [recentDrafts])

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
    saveCurrentToRecent(text)
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

  function saveCurrentToRecent(content) {
    const normalized = content.trim()
    if (!normalized) return

    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: getDraftTitle(normalized),
      content: normalized,
      updatedAt: Date.now(),
    }

    setRecentDrafts((prev) => {
      const deduped = prev.filter((d) => d.content !== normalized)
      return [item, ...deduped].slice(0, MAX_HISTORY)
    })
  }

  const handleImportTemplate = () => {
    setText(TEMPLATE_TEXT)
    setSaveStatus('模板已导入')
  }

  const handleLoadRecent = (content) => {
    setText(content)
    setSaveStatus('已载入历史草稿')
  }

  const handleDeleteRecent = (id) => {
    setRecentDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  const handleClearRecent = () => {
    setRecentDrafts([])
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
      const content = await file.text()
      setText(content)
      saveCurrentToRecent(content)
      setSaveStatus(`已导入：${file.name}`)
    } catch {
      setSaveStatus('导入失败，请重试')
    } finally {
      event.target.value = ''
    }
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
                导入MD
              </button>
              <button type="button" className="ghost-button" onClick={handleImportTemplate}>
                导入模板
              </button>
              <button type="button" className="ghost-button" onClick={() => saveCurrentToRecent(text)}>
                保存到最近
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

          <div className="recent-header">
            <span>最近草稿（最多 40 条）</span>
            <button type="button" className="mini-danger" onClick={handleClearRecent}>
              清空记录
            </button>
          </div>
          <div className="recent-list">
            {recentDrafts.length === 0 ? (
              <p className="recent-empty">暂无历史记录</p>
            ) : (
              recentDrafts.map((draft) => (
                <div key={draft.id} className="recent-item">
                  <button type="button" className="recent-load" onClick={() => handleLoadRecent(draft.content)}>
                    <strong>{draft.title}</strong>
                    <span>{new Date(draft.updatedAt).toLocaleString()}</span>
                  </button>
                  <button type="button" className="mini-danger" onClick={() => handleDeleteRecent(draft.id)}>
                    删除
                  </button>
                </div>
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
