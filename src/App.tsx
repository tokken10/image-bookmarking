import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'

type ImageItem = {
  id: string
  url: string
  createdAt: number
  error?: boolean
}

const STORAGE_KEY = 'image_bookmarks_v1'
const THEME_STORAGE_KEY = 'theme'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY)
      if (stored) return stored === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })
  const [urlInput, setUrlInput] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
    }
  }, [isDarkMode])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((d) => !d)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ImageItem[]
        setImages(parsed)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
    } catch { /* ignore */ }
  }, [images])

  const isValidUrl = useMemo(() => {
    if (!urlInput.trim()) return false
    try {
      const u = new URL(urlInput.trim())
      return ['http:', 'https:'].includes(u.protocol)
    } catch {
      return false
    }
  }, [urlInput])

  const addImage = useCallback(async () => {
    if (!isValidUrl || isSubmitting) return
    setIsSubmitting(true)
    const newItem: ImageItem = {
      id: crypto.randomUUID(),
      url: urlInput.trim(),
      createdAt: Date.now(),
    }
    setImages(prev => [newItem, ...prev])
    setUrlInput('')
    setIsSubmitting(false)
  }, [isValidUrl, urlInput, isSubmitting])

  const removeImage = useCallback((id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
    setViewerIndex(curr => (curr === null ? null : Math.min(curr, images.length - 2)))
  }, [images.length])

  const handleImageError = useCallback((id: string) => {
    setImages(prev => prev.map(img =>
      img.id === id ? { ...img, error: true } : img
    ))
  }, [])

  const openViewer = useCallback((index: number) => {
    setViewerIndex(index)
  }, [])

  const closeViewer = useCallback(() => {
    setViewerIndex(null)
  }, [])

  const goPrev = useCallback(() => {
    setViewerIndex(curr => (curr === null ? null : (curr - 1 + images.length) % images.length))
  }, [images.length])

  const goNext = useCallback(() => {
    setViewerIndex(curr => (curr === null ? null : (curr + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (viewerIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer()
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewerIndex, closeViewer, goPrev, goNext])

  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    const threshold = 40
    if (delta > threshold) {
      goPrev()
    } else if (delta < -threshold) {
      goNext()
    }
    touchStartX.current = null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addImage()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">📸 My Image Wall</h1>
            <button
              type="button"
              onClick={toggleDarkMode}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-800 shadow-md rounded-xl p-4"
          >
            <input
              type="url"
              placeholder="Paste image URL (https://example.com/image.jpg)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!isValidUrl || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Image'}
            </button>
          </form>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {images.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-24">
            <p className="text-xl font-semibold mb-2">No images yet</p>
            <p>Paste an image URL above and click "Add Image" to get started</p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
            {images.map((img, idx) => (
              <div key={img.id} className="break-inside-avoid">
                {img.error ? (
                  <div className="w-full h-32 flex flex-col items-center justify-center text-center p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg shadow-sm">
                    <p className="text-sm font-medium text-red-600 dark:text-red-300">Failed to load image</p>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="mt-2 text-xs text-red-500 dark:text-red-300 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative group rounded-xl overflow-hidden shadow hover:shadow-xl bg-white dark:bg-gray-800 transition-all duration-200">
                    <button
                      onClick={() => openViewer(idx)}
                      className="block w-full focus:outline-none"
                    >
                      <img
                        src={img.url}
                        alt={`Image ${idx + 1}`}
                        className="w-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.03]"
                        loading="lazy"
                        onError={() => handleImageError(img.id)}
                      />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 bg-white/90 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 p-2 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Remove image"
                    >
                      <svg className="w-4 h-4 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Viewer */}
      {viewerIndex !== null && images[viewerIndex] && !images[viewerIndex].error && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 dark:bg-black/90"
          onClick={closeViewer}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute inset-0" />
          <div
            className="relative mx-4 max-w-[95vw] max-h-[95vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[viewerIndex].url}
              alt="Full image"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            />
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                onClick={goPrev}
                className="m-2 rounded-full bg-white/90 dark:bg-gray-700 p-3 text-gray-900 dark:text-gray-100 shadow-lg hover:bg-white dark:hover:bg-gray-600 transition-all"
                aria-label="Previous image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <button
                onClick={goNext}
                className="m-2 rounded-full bg-white/90 dark:bg-gray-700 p-3 text-gray-900 dark:text-gray-100 shadow-lg hover:bg-white dark:hover:bg-gray-600 transition-all"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 bg-white/90 dark:bg-gray-700 p-2 rounded-full shadow-lg text-gray-900 dark:text-gray-100 hover:bg-white dark:hover:bg-gray-600 transition-all"
              aria-label="Close viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
              {viewerIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App