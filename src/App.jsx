import { useEffect, useRef, useState } from 'react'
import { Edit2, FlipHorizontal, Play, Smartphone, X, ZoomIn, ZoomOut } from 'lucide-react'
import './App.css'

function App() {
  const [text, setText] = useState('')
  const [isEditing, setIsEditing] = useState(true)
  const [fontSize, setFontSize] = useState(72)
  const [isMirrored, setIsMirrored] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isRotated, setIsRotated] = useState(false)
  const containerRef = useRef(null)

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

  return (
    <div className="app">
      {isEditing ? (
        <div className="editor-layout">
          <div className="editor-header">
            <h1 className="editor-title">
              <Edit2 size={24} /> 提词器文本编辑
            </h1>
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

          <button onClick={handleStart} className="start-button">
            <Play size={24} fill="currentColor" /> 开始提词
          </button>
        </div>
      ) : (
        <div className="teleprompter-shell">
          <div
            className="teleprompter-stage"
            style={{
              width: isRotated ? '100vh' : '100vw',
              height: isRotated ? '100vw' : '100vh',
              transform: isRotated ? 'rotate(90deg)' : 'none',
            }}
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
              style={{ paddingTop: '30vh', paddingBottom: '50vh' }}
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
