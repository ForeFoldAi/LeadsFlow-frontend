import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [rawHH, rawMM] = (value || "09:00").split(":");
  const totalHour = parseInt(rawHH ?? "9", 10);
  const minute = rawMM?.slice(0, 2) ?? "00";
  const isPM = totalHour >= 12;
  const hour12 = String(totalHour % 12 || 12).padStart(2, "0");
  const ampm = isPM ? "PM" : "AM";

  const emit = (h12: string, m: string, ap: string) => {
    let h24 = parseInt(h12, 10);
    h24 = ap === "AM" ? (h24 === 12 ? 0 : h24) : (h24 === 12 ? 12 : h24 + 12);
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  };

  const handleHour = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(1, Math.min(12, n));
    emit(String(clamped).padStart(2, "0"), minute, ampm);
  };

  const handleMinute = (raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const clamped = Math.max(0, Math.min(59, n));
    emit(hour12, String(clamped).padStart(2, "0"), ampm);
  };

  const inputCls =
    "w-10 text-center text-sm font-semibold bg-transparent outline-none border-0 focus:bg-muted/50 rounded py-0.5 transition-colors";

  return (
    <div
      className={cn(
        "flex items-center border rounded-md h-10 px-2 gap-1 bg-background w-full",
        className
      )}
    >
      <input
        type="number"
        min={1}
        max={12}
        value={hour12}
        onChange={(e) => handleHour(e.target.value)}
        className={inputCls}
        style={{ MozAppearance: "textfield" } as any}
      />
      <span className="text-muted-foreground font-bold select-none">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={minute}
        onChange={(e) => handleMinute(e.target.value)}
        className={inputCls}
        style={{ MozAppearance: "textfield" } as any}
      />
      <div className="ml-1 flex items-center border rounded overflow-hidden text-xs font-semibold">
        <button
          type="button"
          onClick={() => emit(hour12, minute, "AM")}
          className={cn(
            "px-2 py-1 transition-colors",
            ampm === "AM" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => emit(hour12, minute, "PM")}
          className={cn(
            "px-2 py-1 transition-colors",
            ampm === "PM" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          PM
        </button>
      </div>
    </div>
  );
}
