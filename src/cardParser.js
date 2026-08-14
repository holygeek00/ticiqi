const DIVIDER_PATTERN = /^\s*-{3,}\s*$/
const NUMBERED_TITLE_PATTERN = /^(?:#{1,6}\s+)?(\d{1,4}\s*[｜丨|]\s*.+)$/u
const MARKDOWN_TITLE_PATTERN = /^#{1,6}\s+(.+)$/u

const createCardId = (index) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`
}

export const getDraftTitle = (content) => {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  if (!firstLine) return '未命名文案'

  const numberedTitle = firstLine.match(NUMBERED_TITLE_PATTERN)?.[1]
  const markdownTitle = firstLine.match(MARKDOWN_TITLE_PATTERN)?.[1]
  return (numberedTitle || markdownTitle || firstLine).trim().slice(0, 36)
}

const splitIntoBlocks = (markdown) => {
  const blocks = []
  let currentLines = []

  const pushCurrentBlock = () => {
    const block = currentLines.join('\n').trim()
    if (block) blocks.push(block)
    currentLines = []
  }

  markdown.split('\n').forEach((line) => {
    if (DIVIDER_PATTERN.test(line)) {
      pushCurrentBlock()
      return
    }

    // A numbered title can start a new copy without requiring an extra `---` line.
    if (NUMBERED_TITLE_PATTERN.test(line.trim()) && currentLines.some((item) => item.trim())) {
      pushCurrentBlock()
    }

    currentLines.push(line)
  })

  pushCurrentBlock()
  return blocks
}

export const parseCopyToCards = (rawCopy) => {
  const normalized = rawCopy.replace(/\r\n?/g, '\n').trim()
  if (!normalized) return []

  return splitIntoBlocks(normalized)
    .map((block, index) => {
      const lines = block.split('\n')
      const firstLine = lines[0]?.trim() ?? ''
      const numberedTitle = firstLine.match(NUMBERED_TITLE_PATTERN)?.[1]
      const markdownTitle = firstLine.match(MARKDOWN_TITLE_PATTERN)?.[1]
      const title = (numberedTitle || markdownTitle || getDraftTitle(block)).trim()
      const hasTitleLine = Boolean(numberedTitle || markdownTitle)
      const body = hasTitleLine ? lines.slice(1).join('\n').trim() : block

      return {
        id: createCardId(index),
        title: title || `文案 ${index + 1}`,
        content: body || title,
        createdAt: Date.now(),
      }
    })
    .filter((card) => card.content.trim())
}

export const isNumberedCopyTitle = (line) => NUMBERED_TITLE_PATTERN.test(line.trim())
