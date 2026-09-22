/**
 * 音效加载说明：
 * - 不使用 .wav 直链，避免下载工具拦截 HTTP 请求
 * - 通过 fetch 加载 .dat，转成 Blob URL 再播放
 * - 首次点击页面时预加载，之后不再发起新请求
 */
const soundFiles = {
  start: 'audio/start.dat',
  classStart: 'audio/class-start.dat',
  classEnd: 'audio/class-end.dat',
  activity: 'audio/pomodoro-class-end.dat',
} as const

export type SoundKey = keyof typeof soundFiles

const blobUrls = new Map<SoundKey, string>()
let preloadPromise: Promise<void> | null = null
let audioUnlocked = false

function resolveAssetPath(relativePath: string) {
  return `${import.meta.env.BASE_URL}${relativePath}`
}

async function loadSound(key: SoundKey) {
  if (blobUrls.has(key)) return
  const response = await fetch(resolveAssetPath(soundFiles[key]))
  if (!response.ok) {
    throw new Error(`加载音效失败: ${soundFiles[key]} (${response.status})`)
  }
  const buffer = await response.arrayBuffer()
  blobUrls.set(key, URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' })))
}

function ensureSoundsLoaded() {
  if (!preloadPromise) {
    preloadPromise = Promise.all(
      (['start', 'activity', 'classEnd', 'classStart'] as SoundKey[]).map((key) => loadSound(key)),
    )
      .then(() => undefined)
      .catch((error) => {
        preloadPromise = null
        console.warn('[audio] 预加载失败:', error)
        throw error
      })
  }
  return preloadPromise
}

export function unlockAudio() {
  if (audioUnlocked) return
  audioUnlocked = true
  void ensureSoundsLoaded()
}

function playKey(key: SoundKey) {
  if (!audioUnlocked) return

  const tryPlay = () => {
    const url = blobUrls.get(key)
    if (!url) return false
    const audio = new Audio(url)
    audio.volume = 1
    void audio.play().catch((error) => {
      console.warn('[audio] 播放失败:', key, error.message)
    })
    return true
  }

  if (tryPlay()) return
  void ensureSoundsLoaded()?.then(() => {
    tryPlay()
  })
}

/** 时间管理「开启 / 暂停」以及番茄学习缓冲音效 */
export function playStartSound() {
  playKey('start')
}

/** 开始学习 */
export function playStudyStartSound() {
  playKey('classStart')
}

/** 开始休息 */
export function playRestStartSound() {
  playKey('classEnd')
}

/** 开始锻炼 */
export function playExerciseStartSound() {
  playKey('activity')
}

export function setupGlobalAudioUnlock() {
  const handler = () => unlockAudio()
  document.addEventListener('pointerdown', handler, { once: true, passive: true })
  document.addEventListener('keydown', handler, { once: true })
}
