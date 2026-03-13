import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  className?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")); // "01".."12"
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));      // "00".."59"

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [rawHH, rawMM] = (value || "09:00").split(":");
  const totalHour = parseInt(rawHH ?? "9", 10);
  const minute = rawMM?.slice(0, 2) ?? "00";
  const isPM = totalHour >= 12;
  const hour12 = String(totalHour % 12 || 12).padStart(2, "0");
  const ampm = isPM ? "PM" : "AM";

  const emit = (h12: string, m: string, ap: string) => {
    let h24 = parseInt(h12, 10);
    if (ap === "AM") {
      h24 = h24 === 12 ? 0 : h24;
    } else {
      h24 = h24 === 12 ? 12 : h24 + 12;
    }
    onChange(`${String(h24).padStart(2, "0")}:${m}`);
  };

  const selectCls =
    "bg-transparent text-sm font-medium outline-none cursor-pointer appearance-none text-center";

  return (
    <div
      className={cn(
        "flex items-center gap-1 border rounded-md px-3 h-10 bg-background select-none",
        className
      )}
    >
      <Clock className="h-4 w-4 text-muted-foreground shrink-0 mr-1" />

      {/* Hour */}
      <select
        value={hour12}
        onChange={(e) => emit(e.target.value, minute, ampm)}
        className={cn(selectCls, "w-8")}
      >
        {HOURS_12.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <span className="text-muted-foreground font-semibold px-0.5">:</span>

      {/* Minute */}
      <select
        value={minute}
        onChange={(e) => emit(hour12, e.target.value, ampm)}
        className={cn(selectCls, "w-8")}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* AM / PM */}
      <select
        value={ampm}
        onChange={(e) => emit(hour12, minute, e.target.value)}
        className={cn(selectCls, "w-10 ml-1 text-muted-foreground")}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
