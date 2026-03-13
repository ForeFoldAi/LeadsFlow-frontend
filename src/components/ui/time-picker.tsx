import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" 24-hour
  onChange: (value: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hh, mm] = (value || "09:00").split(":");
  const hour = HOURS.includes(hh) ? hh : "09";
  const minute = MINUTES.includes(mm) ? mm : "00";

  const update = (newHour: string, newMinute: string) => {
    onChange(`${newHour}:${newMinute}`);
  };

  const displayHour = parseInt(hour) % 12 || 12;
  const amPm = parseInt(hour) >= 12 ? "PM" : "AM";

  return (
    <div className={cn("flex items-center gap-1.5 border rounded-md px-3 h-10 bg-background", className)}>
      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Hour */}
      <select
        value={hour}
        onChange={(e) => update(e.target.value, minute)}
        className="bg-transparent text-sm outline-none cursor-pointer appearance-none w-8 text-center font-medium"
      >
        {HOURS.map((h) => {
          const disp = parseInt(h) % 12 || 12;
          const suffix = parseInt(h) >= 12 ? " PM" : " AM";
          return (
            <option key={h} value={h}>
              {String(disp).padStart(2, "0")}{suffix}
            </option>
          );
        })}
      </select>

      <span className="text-muted-foreground font-medium">:</span>

      {/* Minute */}
      <select
        value={minute}
        onChange={(e) => update(hour, e.target.value)}
        className="bg-transparent text-sm outline-none cursor-pointer appearance-none w-7 text-center font-medium"
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      {/* AM/PM badge */}
      <span className="text-xs text-muted-foreground font-medium ml-0.5">{amPm}</span>
    </div>
  );
}
