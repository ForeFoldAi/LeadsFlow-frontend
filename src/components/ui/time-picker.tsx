import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  className?: string;
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [rawHH, rawMM] = (value || "09:00").split(":");
  const totalHour = parseInt(rawHH ?? "9", 10);
  const isPM = totalHour >= 12;
  const hour12 = String(totalHour % 12 || 12).padStart(2, "0");
  const minute = rawMM?.slice(0, 2) ?? "00";
  const ampm = isPM ? "PM" : "AM";

  const [localHour, setLocalHour] = useState(hour12);
  const [localMinute, setLocalMinute] = useState(minute);

  // Sync local state when external value changes
  useEffect(() => {
    setLocalHour(hour12);
    setLocalMinute(minute);
  }, [value]);

  const emit = (h12: string, m: string, ap: string) => {
    let h24 = parseInt(h12, 10);
    if (isNaN(h24)) h24 = 12;
    h24 = ap === "AM" ? (h24 === 12 ? 0 : h24) : (h24 === 12 ? 12 : h24 + 12);
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  };

  const commitHour = (raw: string) => {
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? 12 : Math.max(1, Math.min(12, n));
    const padded = String(clamped).padStart(2, "0");
    setLocalHour(padded);
    emit(padded, localMinute, ampm);
  };

  const commitMinute = (raw: string) => {
    const n = parseInt(raw, 10);
    const clamped = isNaN(n) ? 0 : Math.max(0, Math.min(59, n));
    const padded = String(clamped).padStart(2, "0");
    setLocalMinute(padded);
    emit(localHour, padded, ampm);
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
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={localHour}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
          setLocalHour(raw);
          // auto-commit when 2 digits entered or value exceeds max
          if (raw.length === 2 || parseInt(raw, 10) > 12) commitHour(raw);
        }}
        onBlur={(e) => commitHour(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={inputCls}
      />
      <span className="text-muted-foreground font-bold select-none">:</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={localMinute}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
          setLocalMinute(raw);
          if (raw.length === 2 || parseInt(raw, 10) > 59) commitMinute(raw);
        }}
        onBlur={(e) => commitMinute(e.target.value)}
        onFocus={(e) => e.target.select()}
        className={inputCls}
      />
      <div className="ml-1 flex items-center border rounded overflow-hidden text-xs font-semibold">
        <button
          type="button"
          onClick={() => emit(localHour, localMinute, "AM")}
          className={cn(
            "px-2 py-1 transition-colors",
            ampm === "AM" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => emit(localHour, localMinute, "PM")}
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
