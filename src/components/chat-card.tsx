import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  X, Bot, User, Download, Trash2,
  Phone, Mail, Globe, RefreshCw,
  ChevronRight, MapPin, Building2, Send,
  BotMessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import leadGeneratorService, { GenerateResponse, LeadResult } from "@/lib/apis/lead-generator.service";
import leadsService from "@/lib/apis/leads.service";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConversationStep =
  | { step: "welcome" }
  | { step: "sector_select" }
  | { step: "custom_sector" }
  | { step: "city_input"; sector: string }
  | { step: "country_select"; sector: string; city: string }
  | { step: "custom_country"; sector: string; city: string }
  | { step: "generating"; sector: string; city: string; country: string; sessionId: string }
  | { step: "results" }
  | { step: "idle" };

type WidgetType =
  | { type: "get_started" }
  | { type: "sector_select"; sectors: string[] }
  | { type: "custom_sector_input" }
  | { type: "city_input"; sector: string }
  | { type: "country_select"; sector: string; city: string }
  | { type: "custom_country_input"; sector: string; city: string }
  | { type: "lead_results"; data: GenerateResponse };

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  widget?: WidgetType;
  widgetDone?: boolean;
  isGenerating?: boolean;
}

interface ChatCardProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COUNTRIES = ["India", "United States", "United Kingdom", "UAE", "Canada", "Australia", "Singapore"];

// Mirrors orchestrator.py SECTOR_HINTS — used as fallback when backend is offline
const FALLBACK_SECTORS = [
  "Capital Goods",
  "FMCG + Cold Chain",
  "Pharmaceuticals",
  "Financial Services",
  "Educational Institution",
  "Real Estate",
  "Interior Design",
  "Industrials Solar",
  "Logistics",
  "Agriculture",
  "Roller Flour Mills",
  "Defence",
];

const LS_SECTORS = "leadsflow_sectors";

type SourceOption = {
  key: string;
  label: string;
  flag?: string;
  indiaOnly?: boolean;
  group: "directory" | "social" | "api";
  requiresAuth?: boolean;
  requiresApiKey?: boolean;
};

const SOURCE_OPTIONS: SourceOption[] = [
  // ── Directory scrapers (no login required) ──────────────────────────────
  { key: "google", label: "Google Maps", group: "directory" },
  { key: "yelp", label: "Yelp", group: "directory" },
  { key: "yellowpages", label: "Yellow Pages", group: "directory" },
  { key: "bbb", label: "BBB", group: "directory" },
  { key: "sulekha", label: "Sulekha", group: "directory", flag: "🇮🇳", indiaOnly: true },
  // ── Social scrapers (require platform login) ────────────────────────────
  { key: "linkedin", label: "LinkedIn", group: "social", requiresAuth: true },
  { key: "facebook", label: "Facebook", group: "social", requiresAuth: true },
  { key: "instagram", label: "Instagram", group: "social", requiresAuth: true },
  { key: "twitter", label: "Twitter / X", group: "social", requiresAuth: true },
  // ── API-based sources (require API key) ─────────────────────────────────
  { key: "apollo", label: "Apollo.io", group: "api", requiresApiKey: true },
];

const DIRECTORY_SOURCES = SOURCE_OPTIONS.filter((s) => s.group === "directory");
const SOCIAL_SOURCES = SOURCE_OPTIONS.filter((s) => s.group === "social");
const API_SOURCES = SOURCE_OPTIONS.filter((s) => s.group === "api");

function defaultSources(country: string): string[] {
  const isIndia = country.toLowerCase().includes("india");
  return DIRECTORY_SOURCES
    .filter((s) => !s.indiaOnly || isIndia)
    .map((s) => s.key);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}




// ── Lead Card ─────────────────────────────────────────────────────────────────

function LeadCard({ lead }: { lead: LeadResult }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 text-xs">
      <p className="font-semibold text-gray-900 text-sm leading-snug">{lead.name || "\u2014"}</p>
      {lead.category && <p className="text-gray-500">{lead.category}</p>}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-500">
        {lead.phone && (
          <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{lead.phone}</span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 min-w-0">
            <Mail className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[160px]">{lead.email}</span>
          </span>
        )}
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors">
            <Globe className="w-3 h-3 shrink-0" />Website
          </a>
        )}
      </div>
    </div>
  );
}

// ── Results Block ─────────────────────────────────────────────────────────────

function LeadResultsBlock({ data, onDownload }: { data: GenerateResponse; onDownload: (t: "csv" | "excel") => void }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? data.leads : data.leads.slice(0, 3);

  return (
    <div className="space-y-2 w-full">
      <p className="text-xs font-semibold text-gray-700">
        Found <span className="text-blue-600">{data.total}</span> leads —{" "}
        <span className="capitalize">{data.sector}</span> in {data.city}
      </p>
      <div className="space-y-2">
        {visible.map((lead, i) => <LeadCard key={i} lead={lead} />)}
      </div>
      {data.leads.length > 3 && (
        <button onClick={() => setShowAll(v => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
          {showAll ? "Show less" : `+ ${data.leads.length - 3} more leads`}
        </button>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => onDownload("csv")}
          className="h-7 text-xs gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50">
          <Download className="w-3 h-3" />CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDownload("excel")}
          className="h-7 text-xs gap-1.5 border-gray-200 text-gray-600 hover:bg-gray-50">
          <Download className="w-3 h-3" />Excel
        </Button>
      </div>
    </div>
  );
}

// ── Widget Renderers ──────────────────────────────────────────────────────────

function GetStartedWidget({ onStart, done }: { onStart: () => void; done?: boolean }) {
  if (done) return null;
  return (
    <div className="mt-3">
      <Button onClick={onStart}
        className="h-9 gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm rounded-xl px-5">
        Get Started <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function SectorSelectWidget({
  sectors, onSelect, onOther, done,
}: { sectors: string[]; onSelect: (s: string) => void; onOther: () => void; done?: boolean }) {
  if (done) return null;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {sectors.map((s) => (
          <button key={s} onClick={() => onSelect(s)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
            {s}
          </button>
        ))}
        <button onClick={onOther}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
          + Other
        </button>
      </div>
    </div>
  );
}

function TextInputWidget({
  placeholder, icon, onSubmit, done,
}: { placeholder: string; icon: React.ReactNode; onSubmit: (v: string) => void; done?: boolean }) {
  const [val, setVal] = useState("");
  if (done) return null;
  return (
    <div className="mt-3 flex gap-2">
      <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 transition-all">
        <span className="text-gray-400 shrink-0">{icon}</span>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onSubmit(val.trim()); setVal(""); } }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0"
        />
      </div>
      <button
        onClick={() => { if (val.trim()) { onSubmit(val.trim()); setVal(""); } }}
        disabled={!val.trim()}
        className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

function SourceChip({
  src, active, onToggle,
}: { src: SourceOption; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={src.requiresAuth ? "Requires platform login" : src.requiresApiKey ? "Requires API key" : undefined}
      className={cn(
        "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shadow-sm flex items-center gap-1",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-gray-600 border-gray-200 hover:border-slate-400 hover:bg-slate-50",
      )}
    >
      {src.flag && <span>{src.flag}</span>}
      {src.label}
      {(src.requiresAuth || src.requiresApiKey) && (
        <span className={cn("text-[10px]", active ? "text-slate-300" : "text-gray-400")}>
          {src.requiresApiKey ? "🔑" : "🔒"}
        </span>
      )}
    </button>
  );
}

function SourceSelectWidget({
  country, onConfirm, done,
}: { country: string; onConfirm: (sources: string[]) => void; done?: boolean }) {
  const isIndia = country.toLowerCase().includes("india");
  const [selected, setSelected] = useState<string[]>(() => defaultSources(country));

  if (done) return null;

  function toggle(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const visibleDirectory = DIRECTORY_SOURCES.filter((s) => !s.indiaOnly || isIndia);

  return (
    <div className="mt-3 space-y-3">

      {/* Directory sources */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Directory</p>
        <div className="flex flex-wrap gap-2">
          {visibleDirectory.map((src) => (
            <SourceChip key={src.key} src={src} active={selected.includes(src.key)} onToggle={() => toggle(src.key)} />
          ))}
        </div>
      </div>

      {/* Social sources */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          Social <span className="normal-case font-normal text-gray-400">(requires login)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {SOCIAL_SOURCES.map((src) => (
            <SourceChip key={src.key} src={src} active={selected.includes(src.key)} onToggle={() => toggle(src.key)} />
          ))}
        </div>
      </div>

      {/* API sources */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
          API <span className="normal-case font-normal text-gray-400">(requires API key)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {API_SOURCES.map((src) => (
            <SourceChip key={src.key} src={src} active={selected.includes(src.key)} onToggle={() => toggle(src.key)} />
          ))}
        </div>
      </div>

      <Button
        size="sm"
        disabled={selected.length === 0}
        onClick={() => onConfirm(selected)}
        className="h-8 text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 disabled:opacity-40"
      >
        Start Searching <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function CountrySelectWidget({
  onSelect, onOther, done,
}: { onSelect: (c: string) => void; onOther: () => void; done?: boolean }) {
  if (done) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {COUNTRIES.map((c) => (
        <button key={c} onClick={() => onSelect(c)}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm">
          {c}
        </button>
      ))}
      <button onClick={onOther}
        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-gray-300 bg-white text-gray-500 hover:border-slate-400 hover:text-slate-700 transition-colors">
        + Other
      </button>
    </div>
  );
}

// ── localStorage persistence ───────────────────────────────────────────────────

const LS_MESSAGES = "leadsflow_chat_messages";
const LS_STEP = "leadsflow_chat_step";

function saveMessages(msgs: Message[]) {
  try {
    localStorage.setItem(LS_MESSAGES, JSON.stringify(
      msgs.map((m) => ({ ...m, timestamp: m.timestamp.toISOString(), isGenerating: false }))
    ));
  } catch { }
}

function loadMessages(): Message[] {
  try {
    const raw = localStorage.getItem(LS_MESSAGES);
    if (!raw) return [];
    return (JSON.parse(raw) as any[]).map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
      isGenerating: false,
    }));
  } catch {
    return [];
  }
}

function saveStep(s: ConversationStep) {
  try {
    localStorage.setItem(LS_STEP, JSON.stringify(s));
  } catch { }
}

function loadStep(): ConversationStep {
  try {
    const raw = localStorage.getItem(LS_STEP);
    if (!raw) return { step: "welcome" };
    const parsed = JSON.parse(raw) as ConversationStep;
    // Can't resume a mid-generation — fall back to idle
    if (parsed.step === "generating") return { step: "idle" };
    return parsed;
  } catch {
    return { step: "welcome" };
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ChatCard({ isOpen, onClose }: ChatCardProps) {
  const [messages, setMessages] = useState<Message[]>(() => loadMessages());
  const [step, setStep] = useState<ConversationStep>(() => loadStep());
  const [sectors, setSectors] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(LS_SECTORS);
      if (cached) return JSON.parse(cached) as string[];
    } catch { }
    return FALLBACK_SECTORS;
  });
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Persist messages whenever they change
  useEffect(() => { saveMessages(messages); }, [messages]);

  // Persist step whenever it changes
  useEffect(() => { saveStep(step); }, [step]);

  // Load sectors — merge generator hardcoded list + backend custom sectors
  useEffect(() => {
    Promise.allSettled([
      leadGeneratorService.getSectors(),
      leadsService.getSectors(),
    ]).then(([genResult, backendResult]) => {
      const gen     = genResult.status     === 'fulfilled' ? genResult.value     : [];
      const backend = backendResult.status === 'fulfilled' ? backendResult.value : [];
      // Merge, deduplicate (case-insensitive), preserve order: generator first, then custom
      const seen = new Set(gen.map((s) => s.toLowerCase()));
      const custom = backend.filter((s) => !seen.has(s.toLowerCase()));
      const merged = [...gen, ...custom];
      if (merged.length > 0) {
        setSectors(merged);
        try { localStorage.setItem(LS_SECTORS, JSON.stringify(merged)); } catch { }
      }
    });
  }, []);

  // Boot welcome message only if there's no history
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome to AI Lead Generator by ForeFold!\n\nI can help you find quality business leads. Ready to get started?",
          timestamp: new Date(),
          widget: { type: "get_started" },
        },
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [isOpen, messages]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Helpers ──

  function markWidgetDone(msgId: string) {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, widgetDone: true } : m));
  }

  function addBotMsg(content: string, widget?: WidgetType, extra?: Partial<Message>) {
    const msg: Message = { id: uid(), role: "assistant", content, timestamp: new Date(), widget, ...extra };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }

  function addUserMsg(content: string) {
    setMessages((prev) => [...prev, { id: uid(), role: "user", content, timestamp: new Date() }]);
  }

  function updateLastBot(fn: (m: Message) => Message) {
    setMessages((prev) => {
      const idx = [...prev].reverse().findIndex((m) => m.role === "assistant");
      if (idx === -1) return prev;
      const real = prev.length - 1 - idx;
      const next = [...prev];
      next[real] = fn(next[real]);
      return next;
    });
  }

  // ── Flow handlers ──

  function handleGetStarted(welcomeId: string) {
    markWidgetDone(welcomeId);
    addUserMsg("Yes, help me with lead generation!");
    setTimeout(() => {
      addBotMsg(
        "Great! Please select the business sector you want leads for:",
        { type: "sector_select", sectors },
      );
      setStep({ step: "sector_select" });
    }, 300);
  }

  function handleSectorSelect(sector: string, msgId: string) {
    markWidgetDone(msgId);
    addUserMsg(sector);
    setTimeout(() => {
      addBotMsg(
        `Nice choice — ${sector}!\n\nNow, which city should I search in?`,
        { type: "city_input", sector },
      );
      setStep({ step: "city_input", sector });
    }, 300);
  }

  function handleCustomSector(msgId: string) {
    markWidgetDone(msgId);
    addBotMsg(
      "Please type your sector or business type:",
      { type: "custom_sector_input" },
    );
    setStep({ step: "custom_sector" });
  }

  function handleCustomSectorSubmit(sector: string, msgId: string) {
    markWidgetDone(msgId);
    addUserMsg(sector);
    // Save to backend immediately so it appears in sector dropdown on next visit
    leadsService.addCustomSector(sector).then(() => {
      setSectors((prev) => {
        const already = prev.some((s) => s.toLowerCase() === sector.toLowerCase());
        return already ? prev : [...prev, sector];
      });
    }).catch(() => { });
    setTimeout(() => {
      addBotMsg(
        `Got it — ${sector}!\n\nWhich city should I search in?`,
        { type: "city_input", sector },
      );
      setStep({ step: "city_input", sector });
    }, 300);
  }

  function handleCityInput(city: string, sector: string, msgId: string) {
    markWidgetDone(msgId);
    addUserMsg(city);
    setTimeout(() => {
      addBotMsg(
        `${city} — perfect!\n\nWhich country is this in?`,
        { type: "country_select", sector, city },
      );
      setStep({ step: "country_select", sector, city });
    }, 300);
  }

  function handleCountrySelect(country: string, sector: string, city: string, msgId: string) {
    markWidgetDone(msgId);
    addUserMsg(country);
    setTimeout(() => {
      const sources = defaultSources(country);
      startGeneration(sector, city, country, sources);
    }, 300);
  }

  function handleCustomCountry(sector: string, city: string, msgId: string) {
    markWidgetDone(msgId);
    addBotMsg(
      "Please type the country name:",
      { type: "custom_country_input", sector, city },
    );
    setStep({ step: "custom_country", sector, city });
  }

  function handleCustomCountrySubmit(country: string, sector: string, city: string, msgId: string) {
    markWidgetDone(msgId);
    addUserMsg(country);
    setTimeout(() => {
      const sources = defaultSources(country);
      startGeneration(sector, city, country, sources);
    }, 300);
  }

  async function startGeneration(sector: string, city: string, country: string, sources: string[]) {
    setIsLoading(true);
    addBotMsg(
      `Searching for ${sector} leads in ${city}, ${country}…\n\nIt takes 5 - 10 mins. Please wait while I scan multiple sources.`,
      undefined,
      { isGenerating: true },
    );
    setStep({ step: "generating", sector, city, country, sessionId: "" });

    try {

      const res = await leadGeneratorService.startGeneration({ sector, city, country, sources, max_per_source: 10, delay: 1.0 });
      setStep({ step: "generating", sector, city, country, sessionId: res.session_id });

      pollRef.current = setInterval(async () => {
        try {
          const poll = await leadGeneratorService.pollGeneration(res.session_id);

          if (poll.status === "completed") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsLoading(false);

            updateLastBot((m) => ({
              ...m,
              isGenerating: false,
              content: poll.total > 0
                ? "Here are the leads I found for you:"
                : `No leads found for ${sector} in ${city}, ${country}. Try a different sector or city.`,
              widget: poll.total > 0 ? { type: "lead_results", data: poll } : undefined,
            }));

            setStep({ step: "results" });

            if (poll.total > 0) {
              setTimeout(() => {
                addBotMsg(
                  "Want to search for more leads? Just click below to start a new search.",
                  { type: "get_started" },
                );
                setStep({ step: "idle" });
              }, 500);
            } else {
              setTimeout(() => {
                addBotMsg(
                  "Want to try a different search?",
                  { type: "get_started" },
                );
                setStep({ step: "idle" });
              }, 500);
            }
          } else if (poll.status === "failed") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsLoading(false);
            updateLastBot((m) => ({
              ...m,
              isGenerating: false,
              content: `Search failed: ${poll.error || "Unknown error"}. Please try again.`,
            }));
            addBotMsg("Want to try again?", { type: "get_started" });
            setStep({ step: "idle" });
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsLoading(false);
          updateLastBot((m) => ({ ...m, isGenerating: false, content: "Lost connection. Please try again." }));
          addBotMsg("Want to try again?", { type: "get_started" });
          setStep({ step: "idle" });
        }
      }, 2500);
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Unknown error";
      updateLastBot((m) => ({ ...m, isGenerating: false, content: `Could not reach the Lead Generator service.\n\n${msg}` }));
      addBotMsg("Want to try again?", { type: "get_started" });
      setStep({ step: "idle" });
    }
  }

  function handleClearHistory() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    setIsLoading(false);
    localStorage.removeItem(LS_MESSAGES);
    localStorage.removeItem(LS_STEP);
    setStep({ step: "welcome" });
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Welcome to AI Lead Generator by ForeFold!\n\nI can help you find quality business leads. Ready to get started?",
      timestamp: new Date(),
      widget: { type: "get_started" },
    }]);
  }

  function handleDownload(sessionId: string, type: "csv" | "excel") {
    const url = type === "csv"
      ? leadGeneratorService.getDownloadCsvUrl(sessionId)
      : leadGeneratorService.getDownloadExcelUrl(sessionId);
    window.open(url, "_blank");
  }

  // ── Render widget ──

  function renderWidget(msg: Message) {
    if (!msg.widget || msg.widgetDone) return null;
    const { widget } = msg;

    if (widget.type === "get_started") {
      return <GetStartedWidget done={msg.widgetDone} onStart={() => handleGetStarted(msg.id)} />;
    }

    if (widget.type === "sector_select") {
      return (
        <SectorSelectWidget
          sectors={widget.sectors.length > 0 ? widget.sectors : sectors}
          done={msg.widgetDone}
          onSelect={(s) => handleSectorSelect(s, msg.id)}
          onOther={() => handleCustomSector(msg.id)}
        />
      );
    }

    if (widget.type === "custom_sector_input") {
      return (
        <TextInputWidget
          placeholder="e.g. Plumbers, Dentists, Solar panels…"
          icon={<Building2 className="w-4 h-4" />}
          done={msg.widgetDone}
          onSubmit={(v) => handleCustomSectorSubmit(v, msg.id)}
        />
      );
    }

    if (widget.type === "city_input") {
      // City input is rendered in the sticky footer, not inline
      return null;
    }

    if (widget.type === "country_select") {
      return (
        <CountrySelectWidget
          done={msg.widgetDone}
          onSelect={(c) => handleCountrySelect(c, widget.sector, widget.city, msg.id)}
          onOther={() => handleCustomCountry(widget.sector, widget.city, msg.id)}
        />
      );
    }



    if (widget.type === "custom_country_input") {
      return (
        <TextInputWidget
          placeholder="e.g. Germany, France, Japan…"
          icon={<MapPin className="w-4 h-4" />}
          done={msg.widgetDone}
          onSubmit={(v) => handleCustomCountrySubmit(v, widget.sector, widget.city, msg.id)}
        />
      );
    }

    if (widget.type === "lead_results") {
      return (
        <div className="mt-3 bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
          <LeadResultsBlock
            data={widget.data}
            onDownload={(type) => handleDownload(widget.data.session_id, type)}
          />
        </div>
      );
    }

    return null;
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40" onClick={onClose} />

      {/* Floating card */}
      <div
        className={cn(
          "fixed z-50 flex flex-col",
          // Mobile: full screen minus header
          "top-16 left-0 right-0 bottom-0",
          // Desktop: floating bottom-right
          "md:top-auto md:left-auto md:bottom-24 md:right-5",
          "md:w-[420px] md:h-[620px]",
          "bg-white",
          "rounded-none md:rounded-2xl",
          "shadow-2xl",
          "border-t border-gray-200 md:border md:border-gray-200",
          "transition-all duration-300 ease-out",
          isOpen
            ? "opacity-100 translate-y-0 md:scale-100"
            : "opacity-0 translate-y-4 md:scale-95 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 md:rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
              <BotMessageSquare className="w-4 h-4 text-purple-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">AI Lead Generator</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isLoading
                  ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />Generating…</span>
                  : <>powered by <span className="text-purple-400">ForeFold</span></>
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>

              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-purple-300" />
                </div>
              )}

              <div className={cn(
                "flex flex-col",
                msg.role === "user" ? "items-end max-w-[78%]" : "items-start w-full max-w-[92%]",
              )}>
                {/* Bubble */}
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-slate-900 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm w-full",
                )}>
                  {msg.isGenerating ? (
                    <span className="flex items-center gap-2 text-gray-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500 shrink-0" />
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    </span>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>

                {/* Widget */}
                {renderWidget(msg)}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {/* Typing dots — only show between flow steps */}
          {isLoading && step.step !== "generating" && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-purple-300" />
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  {[0, 150, 300].map((delay) => (
                    <div key={delay} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Footer ── */}
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 md:rounded-b-2xl shrink-0">
          {step.step === "city_input" ? (
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-200 transition-all">
                <span className="text-gray-400 shrink-0"><MapPin className="w-4 h-4" /></span>
                <input
                  autoFocus
                  key={step.step}
                  defaultValue=""
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.currentTarget as HTMLInputElement).value.trim()) {
                      const v = (e.currentTarget as HTMLInputElement).value.trim();
                      // find the city_input message to mark done
                      const cityMsg = [...messages].reverse().find((m) => m.widget?.type === "city_input");
                      if (cityMsg) handleCityInput(v, (cityMsg.widget as { type: "city_input"; sector: string }).sector, cityMsg.id);
                      (e.currentTarget as HTMLInputElement).value = "";
                    }
                  }}
                  placeholder="Which city should I search in?"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none min-w-0"
                />
              </div>
              <button
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLElement).previousElementSibling?.querySelector("input") as HTMLInputElement | null;
                  if (input && input.value.trim()) {
                    const v = input.value.trim();
                    const cityMsg = [...messages].reverse().find((m) => m.widget?.type === "city_input");
                    if (cityMsg) handleCityInput(v, (cityMsg.widget as { type: "city_input"; sector: string }).sector, cityMsg.id);
                    input.value = "";
                  }
                }}
                className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-gray-400 text-center">
              AI Lead Generator · powered by <span className="text-purple-500 font-medium">ForeFold</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
}
