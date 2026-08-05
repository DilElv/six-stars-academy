// PDFKit's standard fonts (and even embedded TTF text fonts like Noto Sans)
// have no glyphs for pictographic emoji — Node's Intl.Segmenter groups each
// emoji (including multi-codepoint ones like skin-tone or ZWJ sequences)
// into a single grapheme cluster, which we swap for a small Twemoji PNG
// fetched at render time and drawn inline via doc.image(), rather than
// letting PDFKit try (and fail) to find a text glyph for it.
const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u
const VARIATION_SELECTOR_16 = 0xfe0f
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })

const emojiImageCache = new Map()

function clusterToTwemojiCodepoints(cluster) {
  return Array.from(cluster)
    .map((ch) => ch.codePointAt(0))
    .filter((cp) => cp !== VARIATION_SELECTOR_16)
    .map((cp) => cp.toString(16))
}

async function fetchEmojiImage(cluster) {
  if (emojiImageCache.has(cluster)) return emojiImageCache.get(cluster)
  const promise = (async () => {
    try {
      const codepoints = clusterToTwemojiCodepoints(cluster)
      const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${codepoints.join('-')}.png`
      const res = await fetch(url)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    } catch {
      return null
    }
  })()
  emojiImageCache.set(cluster, promise)
  return promise
}

// Splits `text` into a flat token list ready for synchronous layout:
// { type: 'word', text } | { type: 'space' } | { type: 'newline' } | { type: 'emoji', image }
// Emoji images are resolved up front (network fetch) so drawRichText() below
// never has to await mid-layout. An emoji whose image can't be fetched
// (offline, unknown codepoint) is simply dropped rather than left as a
// broken/garbled glyph.
export async function buildRichTextTokens(text) {
  const tokens = []
  let currentWord = ''
  const flushWord = () => {
    if (currentWord) { tokens.push({ type: 'word', text: currentWord }); currentWord = '' }
  }

  const pending = []
  for (const { segment } of segmenter.segment(text)) {
    if (segment === '\n') {
      flushWord()
      tokens.push({ type: 'newline' })
    } else if (/\s/.test(segment)) {
      flushWord()
      tokens.push({ type: 'space' })
    } else if (EXTENDED_PICTOGRAPHIC.test(segment)) {
      flushWord()
      const token = { type: 'emoji', image: null }
      tokens.push(token)
      pending.push(fetchEmojiImage(segment).then((image) => { token.image = image }))
    } else {
      currentWord += segment
    }
  }
  flushWord()
  await Promise.all(pending)
  return tokens.filter((t) => t.type !== 'emoji' || t.image)
}

// Lays out and draws pre-resolved tokens with word-wrap, mixing normal text
// (via doc.text with lineBreak disabled, one run at a time) with inline
// emoji images sized to match the current font size. Returns the y position
// just below the last line, for callers that need to size a container.
export function drawRichText(doc, tokens, x, y, width, { fontSize = 9, lineGap = 4 } = {}) {
  doc.fontSize(fontSize)
  const lineHeight = doc.currentLineHeight() + lineGap
  const emojiSize = fontSize * 1.15
  const rightEdge = x + width
  let cx = x
  let cy = y
  let atLineStart = true

  const newLine = () => { cx = x; cy += lineHeight; atLineStart = true }

  for (const token of tokens) {
    if (token.type === 'newline') { newLine(); continue }
    if (token.type === 'space') {
      if (atLineStart) continue
      cx += doc.widthOfString(' ')
      continue
    }
    if (token.type === 'word') {
      const w = doc.widthOfString(token.text)
      if (!atLineStart && cx + w > rightEdge) newLine()
      doc.text(token.text, cx, cy, { lineBreak: false })
      cx += w
      atLineStart = false
      continue
    }
    if (token.type === 'emoji') {
      if (!atLineStart && cx + emojiSize > rightEdge) newLine()
      try {
        doc.image(token.image, cx, cy - 1, { width: emojiSize, height: emojiSize })
      } catch {
        // corrupted/unsupported image payload — skip rather than crash the whole PDF
      }
      cx += emojiSize + 2
      atLineStart = false
    }
  }

  return cy + lineHeight
}
