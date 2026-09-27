import { Search } from "lucide-react";

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="mb-5 flex h-10 w-full items-center gap-2 rounded-full border border-umber/10 bg-ivory-deep/60 px-4 transition-colors focus-within:border-clay focus-within:ring-2 focus-within:ring-clay/10">
      <Search className="size-4 shrink-0 text-umber-soft" aria-hidden="true" />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full min-w-0 w-full bg-transparent text-base text-umber outline-none placeholder:text-umber-soft/70 focus-visible:outline-none"
      />
    </div>
  );
}
