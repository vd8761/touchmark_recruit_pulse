import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import * as RPNInput from "react-phone-number-input"
import flags from "react-phone-number-input/flags"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void
  }

import { getExampleNumber, parsePhoneNumber, AsYouType } from "libphonenumber-js"
import examples from "libphonenumber-js/examples.mobile.json"

export const PhoneInput = React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
  ({ className, onChange, value, defaultCountry, onCountryChange, ...props }, ref) => {
    const [country, setCountry] = React.useState<RPNInput.Country | undefined>(defaultCountry)

    const handleCountryChange = (newCountry?: RPNInput.Country) => {
      setCountry(newCountry)
      if (onCountryChange) onCountryChange(newCountry)
    }

    const example = React.useMemo(() => {
      if (!country) return null
      try {
        return getExampleNumber(country, examples)
      } catch (e) {
        return null
      }
    }, [country])

    const maxLength = example ? example.nationalNumber.length : null
    
    const currentLength = React.useMemo(() => {
      if (!value) return 0
      try {
        const parsed = parsePhoneNumber(value as string)
        return parsed ? parsed.nationalNumber.length : 0
      } catch (e) {
        return 0
      }
    }, [value])

    const placeholder = React.useMemo(() => {
      if (!example || !country) return "+1 (555) 000-0000"
      return new AsYouType(country).input(example.nationalNumber)
    }, [example, country])

    return (
      <div className={cn("relative w-full flex items-center", className)}>
        <RPNInput.default
          ref={ref}
          className="flex w-full rounded-[12px] border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 focus-within:bg-white focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 shadow-sm transition-all"
          flagComponent={FlagComponent}
          countrySelectComponent={CountrySelect}
          inputComponent={InputComponent}
          international={false}
          onChange={(val) => {
            if (val && maxLength) {
              try {
                const parsed = parsePhoneNumber(val as string)
                if (parsed && parsed.nationalNumber.length > maxLength) {
                  return // Block input if it exceeds the maximum allowed digits
                }
              } catch (e) {
                // ignore parsing errors during typing
              }
            }
            onChange?.(val || "")
          }}
          onCountryChange={handleCountryChange}
          defaultCountry={defaultCountry}
          value={value}
          limitMaxLength={true}
          maxDigits={maxLength}
          {...props}
          placeholder={placeholder}
        />
        {maxLength && (
          <div className="absolute right-4 text-[12px] font-semibold text-slate-400 pointer-events-none bg-inherit pl-2">
            <span className={currentLength === maxLength ? "text-emerald-500" : "text-slate-400"}>{currentLength}</span>
            <span className="opacity-50">/</span>
            <span>{maxLength}</span>
          </div>
        )}
      </div>
    )
  }
)
PhoneInput.displayName = "PhoneInput"

const InputComponent = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { maxDigits?: number | null }>(
  ({ className, maxDigits, onKeyDown, onPaste, ...props }, ref) => {
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (maxDigits && /\d/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const digits = e.currentTarget.value.replace(/\D/g, "");
        const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;
        
        if (digits.length >= maxDigits && !hasSelection) {
          e.preventDefault();
        }
      }
      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (maxDigits) {
        const pastedText = e.clipboardData.getData("text");
        const digits = e.currentTarget.value.replace(/\D/g, "");
        const pastedDigits = pastedText.replace(/\D/g, "");
        const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;
        
        if (!hasSelection && digits.length + pastedDigits.length > maxDigits) {
          e.preventDefault();
        }
      }
      onPaste?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      
      // If the user pastes or autofills a massive string (like +91 99999 99999)
      if (val.length > 5) {
        try {
          // If the autofilled string contains a +, it's an international number
          // We must strip the country code before our component sees it, because
          // international={false} will otherwise treat it as a massive local number and block it.
          const parsed = RPNInput.parsePhoneNumber(val);
          if (parsed && parsed.nationalNumber) {
            val = parsed.nationalNumber;
          } else {
            // Fallback: aggressively strip spaces and non-digits if parsing fails
            val = val.replace(/\s+/g, '');
            val = val.replace(/[^\d]/g, '');
          }
        } catch (err) {
          val = val.replace(/\s+/g, '');
          val = val.replace(/[^\d]/g, '');
        }
      }
      
      e.target.value = val;
      props.onChange?.(e);
    };

    return (
      <Input
        className={cn(
          "rounded-e-[12px] rounded-s-none h-11 md:h-12 w-full bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 pr-14 text-[15px] placeholder:text-slate-400 outline-none",
          className
        )}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={handleChange}
        {...props}
        ref={ref}
      />
    )
  }
)
InputComponent.displayName = "InputComponent"

type CountrySelectOption = { label: string; value: RPNInput.Country }

type CountrySelectProps = {
  disabled?: boolean
  value: RPNInput.Country
  onChange: (value: RPNInput.Country) => void
  options: CountrySelectOption[]
}

const PRIORITY_COUNTRIES: RPNInput.Country[] = ["IN", "SG", "JP", "AE"]

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const [open, setOpen] = React.useState(false)

  const handleSelect = React.useCallback(
    (country: RPNInput.Country) => {
      onChange(country)
      setOpen(false)
    },
    [onChange]
  )

  const sortedOptions = React.useMemo(() => {
    if (!options) return []
    const validOptions = options.filter((x) => x.value)
    const priority = validOptions.filter((o) => PRIORITY_COUNTRIES.includes(o.value))
    const others = validOptions.filter((o) => !PRIORITY_COUNTRIES.includes(o.value))
    return [...priority, ...others]
  }, [options])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className={cn(
          "flex h-11 md:h-12 rounded-e-none rounded-s-[12px] px-3 py-0 items-center justify-center hover:bg-slate-200/50 focus-visible:bg-transparent active:bg-transparent border-r border-slate-200/80 shadow-none text-slate-700 outline-none shrink-0 transition-colors",
          open && "bg-slate-200/50"
        )}
        disabled={disabled}
      >
        <FlagComponent country={value} countryName={value} />
        {value && <span className="text-[15px] font-medium ml-2">+{RPNInput.getCountryCallingCode(value)}</span>}
        <ChevronsUpDown className={cn("h-4 w-4 opacity-50 ml-1.5", disabled ? "hidden" : "opacity-100")} />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandList>
            <CommandInput placeholder="Search country..." />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {sortedOptions.map((option) => (
                <CommandItem className="gap-2 cursor-pointer" key={option.value} onSelect={() => handleSelect(option.value)}>
                  <FlagComponent country={option.value} countryName={option.label} />
                  <span className="flex-1 text-sm">{option.label}</span>
                  {option.value && (
                    <span className="text-slate-500 text-sm">
                      {`+${RPNInput.getCountryCallingCode(option.value)}`}
                    </span>
                  )}
                  <Check
                    className={cn("ml-auto h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  if (!country) {
    return <span className="flex h-4 w-6 shrink-0 bg-slate-100 rounded-[2px]" />
  }

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-[2px] shrink-0 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] bg-slate-100">
      <img
        alt={countryName}
        src={`https://purecatamphetamine.github.io/country-flag-icons/3x2/${country}.svg`}
        className="w-full h-full object-cover"
      />
    </span>
  )
}
FlagComponent.displayName = "FlagComponent"
