import { useId, useRef } from 'react'
import { useModalDialog } from './useModalDialog'
import { GUIDE_SLIDES, guideSlideSrc } from './userGuideSlides'

/**
 * The user guide, read inside the app: a full-screen view of the guide's slides, one under the
 * other. Nothing downloads and nothing leaves the app. Each slide carries its text for screen
 * readers, and the page can be pinch-zoomed for the small print on a phone.
 */
export function UserGuide({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useModalDialog(panelRef, isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      data-testid="user-guide"
      className="fixed inset-0 z-50 overflow-y-auto bg-level-3 outline-none animate-fade-in"
    >
      <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-level-3/90 px-4 py-2 backdrop-blur">
        <span />
        <h2 id={titleId} className="text-base font-semibold text-ink">
          User guide
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="justify-self-end min-h-[44px] rounded-full px-4 text-base font-semibold text-highlight state"
        >
          Done
        </button>
      </div>

      <ol className="mx-auto flex max-w-[1000px] flex-col gap-4 px-4 py-5 sm:gap-6 sm:px-6">
        {GUIDE_SLIDES.map((slide, i) => (
          <li key={i} data-testid="guide-slide">
            <figure>
              <img
                src={guideSlideSrc(i + 1)}
                alt={slide.title}
                width={1921}
                height={1080}
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                className="block h-auto w-full rounded-group border border-edge shadow-floating"
              />
              <figcaption className="sr-only">{slide.text}</figcaption>
            </figure>
          </li>
        ))}
      </ol>
    </div>
  )
}
