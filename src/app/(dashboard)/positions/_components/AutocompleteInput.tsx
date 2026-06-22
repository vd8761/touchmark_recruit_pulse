import { useState, useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

export function AutocompleteInput({ 
  name, 
  placeholder, 
  type,
  className 
}: { 
  name: string; 
  placeholder: string; 
  type: "role" | "department";
  className?: string;
}) {
  const { register, watch, setValue, formState: { errors } } = useFormContext();
  const value = watch(name);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/autocomplete?type=${type}&q=${encodeURIComponent(value)}`);
        const data = await res.json();
        
        if (!Array.isArray(data)) {
          console.error("Autocomplete API returned non-array:", data);
          setSuggestions([]);
          setOpen(false);
          return;
        }
        
        // Don't show suggestion if it's exactly what's typed
        const filtered = data.filter((item: string) => item.toLowerCase() !== value.toLowerCase());
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, type]);

  return (
    <div className="relative w-full">
      <input 
        {...register(name)} 
        autoComplete="off"
        placeholder={placeholder} 
        className={className}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay closing to allow clicks on suggestions
          setTimeout(() => setOpen(false), 200);
        }}
      />
      
      {open && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-slate-200 shadow-xl bg-white overflow-hidden">
          <Command>
            <CommandList className="max-h-[200px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
              <CommandGroup>
                {suggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => {
                      setValue(name, suggestion, { shouldValidate: true });
                      setOpen(false);
                    }}
                    onMouseDown={(e) => {
                      // Prevent onBlur from firing before onSelect
                      e.preventDefault(); 
                    }}
                    className="text-[14px] cursor-pointer focus:bg-slate-50 focus:text-slate-900 font-medium py-2 px-3"
                  >
                    {suggestion}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
