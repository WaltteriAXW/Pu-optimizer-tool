import { useId } from 'react'
import { ChevronsUpDown } from 'lucide-react'

/**
 * Small controls shared across the app, styled after their Apple counterparts. Each is built on
 * the native element that behaves the same way — radios for a segmented control, a button with
 * role="switch" for a switch — so keyboard, screen reader and Voice Control support come with it.
 */

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Stable hook for the end-to-end tests */
  testId?: string
}

/**
 * A segmented control: a capsule track with equal segments, the chosen one raised on it.
 *
 * Native radios underneath, each stretched invisibly over its segment: arrow keys move between
 * them, a screen reader announces "1 of 3", and the radio itself is what gets pressed.
 */
export function SegmentedControl<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  fullWidth = false,
  labelVisible = false,
}: {
  name: string
  /** Names the group for assistive technology; shown above it when labelVisible */
  label: string
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (value: T) => void
  fullWidth?: boolean
  labelVisible?: boolean
}) {
  const labelId = useId()
  return (
    <div role="radiogroup" aria-labelledby={labelId} className={fullWidth ? 'w-full' : undefined}>
      <span
        id={labelId}
        className={labelVisible ? 'mb-1.5 block text-sm font-semibold text-slate-700' : 'sr-only'}
      >
        {label}
      </span>
      <div className={`segmented ${fullWidth ? 'grid w-full' : ''}`}>
        {options.map((option) => {
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={`segment has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500 ${
                checked ? 'segment-selected' : ''
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                data-testid={option.testId}
                // Reaches into the track's padding, so the hit region is 48 px for a 40 px segment
                className="absolute inset-x-0 -inset-y-1 cursor-pointer opacity-0"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/**
 * An on/off switch. Green when on, as the system switch is; the knob position carries the
 * state as well, so it is never colour alone.
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  const descriptionId = useId()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={description ? descriptionId : undefined}
      onClick={() => onChange(!checked)}
      className="flex min-h-[44px] w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-base text-slate-900">{label}</span>
        {description && (
          <span id={descriptionId} className="mt-0.5 block text-sm text-slate-500">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative inline-flex h-[31px] w-[51px] flex-shrink-0 rounded-full transition-colors motion-reduce:transition-none ${
          checked ? 'bg-emerald-600' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          }`}
        />
      </span>
    </button>
  )
}

/**
 * A pop-up button over a native select: rounded, with up-and-down chevrons, as a system
 * pop-up button has. Native underneath, so an iPhone opens its picker wheel, a desktop its
 * menu, and keyboard and screen reader behaviour come for free.
 */
export function PopUpSelect({
  children,
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select {...props} className="popup">
        {children}
      </select>
      <ChevronsUpDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
      />
    </div>
  )
}
