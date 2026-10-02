import { useState, type ReactNode, type Ref } from 'react'
import checkoutArrow from '@/assets/figma/arrow-down.svg'
import lightArrow from '@/assets/figma/profile-arrow.svg'
import hideIcon from '@/assets/figma/profile-hide.svg'
import mutedArrow from '@/assets/figma/wallet-arrow.svg'
import { ENS_SUFFIXES } from '@/lib/api/types'
import { cn } from '@/lib/utils'

/**
 * Form fields shared by the profile, wallets and checkout forms. Every control gets its error associated through
 * `aria-describedby` and flagged with `aria-invalid`. Two layouts follow the design: `account` (profile and wallets:
 * 417 px columns) and `checkout` (two-column grid, taller labels).
 */
export type FieldLayout = 'account' | 'checkout'

export const controlClass =
  'h-10 w-full rounded-[3px] border border-border bg-transparent px-3 text-sm leading-4 text-foreground outline-none placeholder:text-sm placeholder:text-tertiary focus-visible:border-primary aria-invalid:border-coral'

const LAYOUTS = {
  account: {
    wrapper: 'flex w-full max-w-[417px] shrink-0 flex-col gap-2.5',
    label: 'flex items-center gap-1 text-[15px] leading-[15px]',
    star: 'text-[22px] leading-[29px] text-coral',
  },
  checkout: {
    wrapper: 'flex flex-col gap-3',
    label: 'text-[15px] leading-[22px]',
    star: 'text-[22px] leading-none text-coral',
  },
} satisfies Record<FieldLayout, Record<string, string>>

/** What a control needs to be labelled and to expose its error. */
export type ControlProps = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string }

export const errorIdFor = (id: string) => `${id}-error`

const controlProps = (id: string, error?: string): ControlProps => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? errorIdFor(id) : undefined,
})

type FieldProps = {
  id: string
  /** Visible label. Without it the control must carry its own `aria-label` (and the checkout layout keeps the row aligned). */
  label?: string
  required?: boolean
  error?: string
  layout?: FieldLayout
  children: (control: ControlProps) => ReactNode
}

export function FormField({ id, label, required, error, layout = 'account', children }: FieldProps) {
  const styles = LAYOUTS[layout]
  return (
    <div className={styles.wrapper}>
      {label ? (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && (
            <span aria-hidden className={styles.star}>
              *
            </span>
          )}
        </label>
      ) : (
        layout === 'checkout' && (
          <span aria-hidden className="hidden leading-[22px] sm:block">
            &nbsp;
          </span>
        )
      )}
      {children(controlProps(id, error))}
      {error && (
        <p id={errorIdFor(id)} className="text-[13px] leading-4 text-coral">
          {error}
        </p>
      )}
    </div>
  )
}

/** The value/blur/change/error props every field below takes; see `fieldProps` in `@/lib/forms`. */
type BoundProps = {
  value: string
  error?: string
  onBlur: () => void
  onChange: (value: string) => void
}

type TextFieldProps = BoundProps &
  Omit<FieldProps, 'children' | 'error'> & {
    /** Accessible name when there is no visible label. */
    ariaLabel?: string
    type?: 'text' | 'email'
    inputMode?: 'email'
    autoComplete?: string
    placeholder?: string
    spellCheck?: boolean
    inputRef?: Ref<HTMLInputElement>
  }

export function TextField({ value, error, onBlur, onChange, ariaLabel, type = 'text', inputMode, autoComplete, placeholder, spellCheck, inputRef, ...field }: TextFieldProps) {
  return (
    <FormField {...field} error={error}>
      {(control) => (
        <input
          {...control}
          ref={inputRef}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          spellCheck={spellCheck}
          aria-label={ariaLabel}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      )}
    </FormField>
  )
}

function SelectArrow({ layout, light }: { layout: FieldLayout; light?: boolean }) {
  return layout === 'checkout' ? (
    <img src={checkoutArrow} alt="" width={10.8333} height={6.16667} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" />
  ) : (
    <img src={light ? lightArrow : mutedArrow} alt="" width={20} height={20} className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2" />
  )
}

type SelectFieldProps = BoundProps &
  Omit<FieldProps, 'children' | 'error'> & {
    placeholder: string
    options: readonly { id: string; label: string }[]
    selectRef?: Ref<HTMLSelectElement>
  }

export function SelectField({ value, error, onBlur, onChange, placeholder, options, selectRef, ...field }: SelectFieldProps) {
  const layout = field.layout ?? 'account'
  return (
    <FormField {...field} error={error}>
      {(control) => (
        <div className="relative">
          <select
            {...control}
            ref={selectRef}
            value={value}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            className={cn(controlClass, 'appearance-none pr-10', !value && 'text-tertiary')}
          >
            <option value="">{placeholder}</option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <SelectArrow layout={layout} />
        </div>
      )}
    </FormField>
  )
}

type EnsFieldProps = {
  id: string
  required?: boolean
  layout?: FieldLayout
  name: BoundProps & { inputRef?: Ref<HTMLInputElement> }
  suffix: Omit<BoundProps, 'error'> & { selectRef?: Ref<HTMLSelectElement> }
}

/** "Nome ENS": the suffix (`.eth`, `.sol`) and the name, labelled together; errors refer to the name. */
export function EnsField({ id, required, layout = 'account', name, suffix }: EnsFieldProps) {
  return (
    <FormField id={id} label="Nome ENS" required={required} error={name.error} layout={layout}>
      {(control) => (
        <div className="flex w-full gap-2.5">
          <div className="relative w-[78px] shrink-0">
            <select
              ref={suffix.selectRef}
              aria-label="Sufixo do nome ENS"
              value={suffix.value}
              onBlur={suffix.onBlur}
              onChange={(event) => suffix.onChange(event.target.value)}
              className={cn(controlClass, 'appearance-none pr-8 pl-2.5 text-[15px] leading-[15px]')}
            >
              {ENS_SUFFIXES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <SelectArrow layout={layout} light />
          </div>
          <input
            {...control}
            ref={name.inputRef}
            value={name.value}
            onBlur={name.onBlur}
            onChange={(event) => name.onChange(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={cn(controlClass, 'min-w-0 flex-1')}
          />
        </div>
      )}
    </FormField>
  )
}

type PasswordFieldProps = BoundProps & {
  id: string
  label: string
  autoComplete: 'current-password' | 'new-password'
  inputRef?: Ref<HTMLInputElement>
}

/** Password input with a show/hide toggle. */
export function PasswordField({ id, label, autoComplete, value, error, onBlur, onChange, inputRef }: PasswordFieldProps) {
  const [revealed, setRevealed] = useState(false)
  return (
    <FormField id={id} label={label} error={error}>
      {(control) => (
        <div className="relative">
          <input
            {...control}
            ref={inputRef}
            type={revealed ? 'text' : 'password'}
            autoComplete={autoComplete}
            value={value}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            className={cn(controlClass, 'pr-12')}
          />
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
            className="absolute top-1/2 right-4 -translate-y-1/2"
          >
            <img src={hideIcon} alt="" width={16.6667} height={14.3942} />
          </button>
        </div>
      )}
    </FormField>
  )
}
