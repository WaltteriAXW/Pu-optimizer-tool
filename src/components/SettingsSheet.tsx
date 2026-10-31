import { useId, useRef } from 'react'
import { BookOpen, ChevronRight, Code2 } from 'lucide-react'
import { useCalculator } from '../context/CalculatorContext'
import { SegmentedControl, Switch } from './controls'
import { useModalDialog } from './useModalDialog'
import { BRAND_NAME } from './BrandMark'
import type { Appearance, PressureUnit } from '../services/displayPreferences'

const REPO_URL = 'https://github.com/WaltteriAXW/Pu-optimizer-tool'
const GUIDE_URL = `${REPO_URL}/blob/main/GETTING_STARTED.md`

const APPEARANCE_OPTIONS = [
  { value: 'system', label: 'Automatic', testId: 'appearance-system' },
  { value: 'light', label: 'Light', testId: 'appearance-light' },
  { value: 'dark', label: 'Dark', testId: 'appearance-dark' },
] as const satisfies ReadonlyArray<{ value: Appearance; label: string; testId: string }>

const UNIT_OPTIONS = [
  { value: 'bar', label: 'bar', testId: 'unit-bar' },
  { value: 'psi', label: 'psi', testId: 'unit-psi' },
] as const satisfies ReadonlyArray<{ value: PressureUnit; label: string; testId: string }>

/**
 * App settings, as a sheet: a bottom sheet on a phone, a centred card on a wide screen.
 *
 * Laid out like the system Settings app — inset grouped sections with a heading above and a
 * footnote below — and every change applies at once, so the only button is Done. Escape and
 * the backdrop close it too.
 */
export function SettingsSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    appearance,
    setAppearance,
    pressureUnit,
    setPressureUnit,
    rememberSetup,
    setRememberSetup,
  } = useCalculator()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useModalDialog(panelRef, isOpen, onClose)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-scrim/40 motion-safe:animate-fade"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="settings-sheet"
        className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-sheet bg-canvas pb-6 shadow-xl outline-none motion-safe:animate-fade sm:max-w-md sm:rounded-sheet"
      >
        {/* Title centred, Done on the trailing edge, as a system sheet has them */}
        <div className="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line bg-canvas/90 px-4 py-2 backdrop-blur">
          <span />
          <h2 id={titleId} className="text-base font-semibold text-ink">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="justify-self-end min-h-[44px] rounded-full px-4 text-base font-semibold text-highlight hover:bg-muted transition-colors"
          >
            Done
          </button>
        </div>

        <div className="space-y-7 px-4 pt-5">
          <SettingsSection
            title="Appearance"
            footnote="Automatic follows your device, and changes when it does."
          >
            <div className="p-3">
              <SegmentedControl
                name="appearance"
                label="Appearance"
                options={APPEARANCE_OPTIONS}
                value={appearance}
                onChange={setAppearance}
                fullWidth
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title="Units"
            footnote="Display only. Calculations and saved runs are always held in bar."
          >
            <div className="flex min-h-[52px] items-center justify-between gap-4 px-4 py-2">
              <span className="text-base text-ink">Pressure</span>
              <SegmentedControl
                name="pressure-unit"
                label="Pressure unit"
                options={UNIT_OPTIONS}
                value={pressureUnit}
                onChange={setPressureUnit}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Form">
            <div className="px-4 py-1">
              <Switch
                label="Remember last setup"
                description="Bring the last calculated inputs back when you return. Turning this off forgets them."
                checked={rememberSetup}
                onChange={setRememberSetup}
              />
            </div>
          </SettingsSection>

          <SettingsSection title="About">
            <div className="flex min-h-[48px] items-center justify-between px-4">
              <span className="text-base text-ink">{BRAND_NAME}</span>
              <span className="text-base text-ink-2 tabular-nums">{__APP_VERSION__}</span>
            </div>
            <SettingsLink href={GUIDE_URL} icon={<BookOpen className="h-5 w-5" />}>
              User guide
            </SettingsLink>
            <SettingsLink href={REPO_URL} icon={<Code2 className="h-5 w-5" />}>
              Source code
            </SettingsLink>
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}

/** An inset grouped section: heading, rounded group of rows divided by hairlines, footnote. */
function SettingsSection({
  title,
  footnote,
  children,
}: {
  title: string
  footnote?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-1.5 px-4 text-sm font-medium text-ink-2">{title}</h3>
      <div className="divide-y divide-line overflow-hidden rounded-group bg-surface">
        {children}
      </div>
      {footnote && <p className="mt-1.5 px-4 text-sm text-ink-2">{footnote}</p>}
    </section>
  )
}

function SettingsLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-[48px] items-center gap-3 px-4 text-base text-ink hover:bg-canvas transition-colors"
    >
      <span aria-hidden="true" className="text-highlight">
        {icon}
      </span>
      <span className="flex-1">{children}</span>
      <ChevronRight aria-hidden="true" className="h-4 w-4 text-ink-2" />
    </a>
  )
}
