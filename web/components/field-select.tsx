"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { value: string; label: string };

/** Labeled single-value select; `items` lets the trigger show the label, not the raw value. */
export function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: React.ReactNode;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        items={options}
        value={value || null}
        disabled={disabled}
        onValueChange={(v) => v !== null && onChange(v as string)}
      >
        <SelectTrigger id={id} className="w-full data-[size=default]:h-10">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
