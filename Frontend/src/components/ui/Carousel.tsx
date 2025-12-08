import React, { useRef, useState, useEffect, ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CarouselProps {
  children: ReactNode
  itemsPerView?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
  gap?: number
  showControls?: boolean
  autoScroll?: boolean
  className?: string
}

export function Carousel({
  children,
  itemsPerView = { mobile: 1, tablet: 2, desktop: 4 },
  gap = 16,
  showControls = true,
  autoScroll = false,
  className = '',
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)
  const [currentView, setCurrentView] = useState(itemsPerView.desktop || 4)

  useEffect(() => {
    const updateView = () => {
      const width = window.innerWidth
      if (width < 768) {
        setCurrentView(itemsPerView.mobile || 1)
      } else if (width < 1024) {
        setCurrentView(itemsPerView.tablet || 2)
      } else {
        setCurrentView(itemsPerView.desktop || 4)
      }
    }

    updateView()
    window.addEventListener('resize', updateView)
    return () => window.removeEventListener('resize', updateView)
  }, [itemsPerView])

  useEffect(() => {
    const checkScroll = () => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current
        setCanScrollLeft(scrollLeft > 0)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
      }
    }

    const element = carouselRef.current
    element?.addEventListener('scroll', checkScroll)
    checkScroll()

    // Auto scroll if enabled
    let intervalId: NodeJS.Timeout
    if (autoScroll && element) {
      intervalId = setInterval(() => {
        if (canScrollRight) {
          scroll('right')
        } else {
          element.scrollTo({ left: 0, behavior: 'smooth' })
        }
      }, 5000)
    }

    return () => {
      element?.removeEventListener('scroll', checkScroll)
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoScroll, canScrollRight])

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = carouselRef.current.clientWidth / currentView + gap
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }

  const childrenArray = React.Children.toArray(children)

  const itemStyle = React.useMemo(
    () => ({
      width: `calc((100% - ${gap * (currentView - 1)}px) / ${currentView})`,
      minWidth: currentView === 1 ? '100%' : '250px',
    }),
    [gap, currentView]
  )

  return (
    <div className={`relative ${className}`}>
      {showControls && canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className='absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
          aria-label='Scroll left'
        >
          <ChevronLeft className='w-5 h-5' />
        </button>
      )}

      <div
        ref={carouselRef}
        className='flex overflow-x-auto scrollbar-hide scroll-smooth'
        style={{ gap: `${gap}px` }}
      >
        {childrenArray.map((child, index) => (
          <div key={index} className='flex-shrink-0' style={itemStyle}>
            {child}
          </div>
        ))}
      </div>

      {showControls && canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className='absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
          aria-label='Scroll right'
        >
          <ChevronRight className='w-5 h-5' />
        </button>
      )}
    </div>
  )
}
