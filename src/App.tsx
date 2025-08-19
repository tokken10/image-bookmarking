import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'

type ImageItem = {
  id: string
  url: string
  createdAt: number
  error?: boolean
}

const STORAGE_KEY = 'image_bookmarks_v1'

function App() {
  const [urlInput, setUrlInput] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ImageItem[]
        setImages(parsed)
      }
    } catch {}
  }, [])

  // Persist to localStorage when images change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images))
    } catch {}
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
    
    // Add immediately for instant feedback
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

  // Keyboard navigation when viewer is open
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

  // Simple swipe support
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header with Input Bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Image Gallery</h1>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="url"
                placeholder="Paste image URL (https://example.com/image.jpg)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!isValidUrl || isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-w-[120px]"
            >
              {isSubmitting ? 'Adding...' : 'Add Image'}
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        {images.length === 0 ? (
          <div className="grid place-items-center py-24 text-center text-gray-500">
            <div className="max-w-md">
              <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No images yet</h2>
              <p className="text-gray-600">Paste an image URL above and click "Add Image" to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {images.map((img, idx) => (
              <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                {img.error ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                    <svg className="w-8 h-8 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm font-medium text-red-600">Failed to load</p>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => openViewer(idx)}
                      className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                    >
                      <img
                        src={img.url}
                        alt="Gallery image"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        loading="lazy"
                        onError={() => handleImageError(img.id)}
                      />
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute top-2 right-2 rounded-full bg-white/90 p-2 text-gray-600 hover:text-red-600 hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Image Viewer Modal */}
      {viewerIndex !== null && images[viewerIndex] && !images[viewerIndex].error && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={closeViewer}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute inset-0" />
          <div className="relative mx-4 max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={images[viewerIndex].url}
              alt="Full size preview"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl object-contain"
            />
            
            {/* Navigation Controls */}
            <div className="absolute inset-y-0 left-0 flex items-center">
              <button
                onClick={goPrev}
                className="m-2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-white"
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
                className="m-2 rounded-full bg-white/90 p-3 text-gray-900 shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Next image"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            {/* Close Button */}
            <button
              onClick={closeViewer}
              className="absolute top-4 right-4 rounded-full bg-white/90 p-2 text-gray-900 shadow-lg hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Close viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Image Counter */}
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
