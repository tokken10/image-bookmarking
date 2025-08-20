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

  const shuffleImages = useCallback(() => {
    setImages(prev => {
      const arr = [...prev]
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    })
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
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-indigo-100 to-indigo-200 dark:from-gray-900 dark:via-gray-950 dark:to-black text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg border-b border-white/20 dark:border-gray-700/40 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 shadow-md">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                  <path d="M3 7a4 4 0 014-4h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7zm4-2a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7zm8 3a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">My Image Wall</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">{images.length} images saved</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.364-8.364h-1M4.636 12H3m14.728 4.728l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728l-.707-.707M6.343 17.657l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={`inline-block h-6 w-6 transform-gpu rounded-full bg-white shadow transition-transform duration-300 ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              </div>
              <button
                type="button"
                onClick={shuffleImages}
                className="px-4 py-2 rounded-3xl bg-blue-600 text-white text-sm font-medium shadow-md hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                Shuffle
              </button>
            </div>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg shadow-lg rounded-3xl p-4"
          >
            <div className="relative flex-1">
              <input
                type="url"
                placeholder="Paste image URL (https://example.com/image.jpg)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className={`w-full rounded-3xl border bg-white/60 dark:bg-gray-800/60 px-5 py-4 text-base placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all ${urlInput ? (isValidUrl ? 'border-green-500' : 'border-red-500') : 'border-gray-300 dark:border-gray-700'}`}
              />
              {urlInput && (
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
                  {isValidUrl ? (
                    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={!isValidUrl || isSubmitting}
              className="flex items-center justify-center px-8 py-4 bg-blue-600 text-white font-medium rounded-3xl shadow-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
            >
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                'Add Image'
              )}
            </button>
          </form>
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {images.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 py-24 space-y-4">
            <div className="p-4 rounded-3xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white shadow-lg">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 7a4 4 0 014-4h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7zm4-2a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H7zm8 3a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-2xl font-semibold">Your wall is empty</p>
            <p className="max-w-md">Paste an image URL above to start building your collection.</p>
            <ul className="text-sm space-y-1">
              <li>• Save and organize your favorite images</li>
              <li>• View them in a beautiful gallery</li>
              <li>• Enjoy light and dark modes</li>
            </ul>
          </div>
        ) : (
          <div className="columns-1 xs:columns-2 sm:columns-3 md:columns-4 lg:columns-5 gap-4 space-y-4">
            {images.map((img, idx) => (
              <div key={img.id} className="break-inside-avoid">
                {img.error ? (
                  <div className="w-full h-36 flex flex-col items-center justify-center text-center p-4 bg-red-100/80 dark:bg-red-900/40 backdrop-blur rounded-3xl border border-red-200/50 dark:border-red-700/50 shadow">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to load image</p>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="mt-2 text-xs text-red-600 dark:text-red-300 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 rounded"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="relative group rounded-3xl overflow-hidden shadow-lg bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm transition-all duration-300">
                    <button
                      onClick={() => openViewer(idx)}
                      className="block w-full focus-visible:outline-none"
                    >
                      <img
                        src={img.url}
                        alt={`Image ${idx + 1}`}
                        className="w-full object-cover transition-transform duration-300 transform-gpu group-hover:scale-105 group-hover:-translate-y-1"
                        loading="lazy"
                        onError={() => handleImageError(img.id)}
                      />
                    </button>
                    <div className="pointer-events-none absolute bottom-0 left-0 w-full bg-black/60 text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Added {new Date(img.createdAt).toLocaleString()}
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-3 right-3 bg-white/90 dark:bg-gray-700/80 hover:bg-white dark:hover:bg-gray-600 p-3 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md dark:bg-black/80"
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
              className="max-h-[90vh] max-w-[90vw] rounded-3xl shadow-2xl object-contain"
            />
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                onClick={goPrev}
                className="m-2 rounded-full bg-white/70 dark:bg-gray-700/70 backdrop-blur p-4 text-gray-900 dark:text-gray-100 shadow-lg hover:bg-white/90 dark:hover:bg-gray-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
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
                className="m-2 rounded-full bg-white/70 dark:bg-gray-700/70 backdrop-blur p-4 text-gray-900 dark:text-gray-100 shadow-lg hover:bg-white/90 dark:hover:bg-gray-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 bg-white/70 dark:bg-gray-700/70 backdrop-blur p-3 rounded-full shadow-lg text-gray-900 dark:text-gray-100 hover:bg-white/90 dark:hover:bg-gray-600 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              aria-label="Close viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur">
              {viewerIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
