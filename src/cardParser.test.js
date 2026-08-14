import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCopyToCards } from './cardParser.js'

test('parses a numbered Markdown heading as card metadata', () => {
  const cards = parseCopyToCards(`### 004｜半天不用全耗在路上

看一次墓地，难道一定要专门空出一整天么？`)

  assert.equal(cards.length, 1)
  assert.equal(cards[0].title, '004｜半天不用全耗在路上')
  assert.equal(cards[0].content, '看一次墓地，难道一定要专门空出一整天么？')
})

test('splits consecutive numbered copies without dividers', () => {
  const cards = parseCopyToCards(`004｜第一条

第一条正文

005 | 第二条

第二条正文`)

  assert.deepEqual(
    cards.map(({ title, content }) => ({ title, content })),
    [
      { title: '004｜第一条', content: '第一条正文' },
      { title: '005 | 第二条', content: '第二条正文' },
    ],
  )
})

test('keeps the original Markdown heading and divider format compatible', () => {
  const cards = parseCopyToCards(`# 第一条
正文一

---

# 第二条
正文二`)

  assert.deepEqual(cards.map((card) => card.title), ['第一条', '第二条'])
  assert.deepEqual(cards.map((card) => card.content), ['正文一', '正文二'])
})
