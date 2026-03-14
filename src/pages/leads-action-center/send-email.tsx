import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor, { RichTextEditorRef } from "@/components/ui/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineLoader } from "@/components/ui/loader";
import { TemplateMultiSelect } from "@/components/ui/template-multi-select";
import { Send, Search, Mail, Loader2, Eye, MessageSquare, Phone, Users, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const VARIABLES = [
  { group: "Lead", vars: [
    { label: "Name", value: "{{name}}" },
    { label: "Company", value: "{{company}}" },
    { label: "Email", value: "{{email}}" },
    { label: "Phone", value: "{{phone}}" },
    { label: "City", value: "{{city}}" },
  ]},
  { group: "Sender", vars: [
    { label: "Sender Name", value: "{{sender_name}}" },
    { label: "Sender Company", value: "{{sender_company}}" },
    { label: "Sender Email", value: "{{sender_email}}" },
    { label: "Sender Phone", value: "{{sender_phone}}" },
    { label: "Sender Website", value: "{{sender_website}}" },
    { label: "Sender Industry", value: "{{sender_industry}}" },
  ]},
];

function VariableChips({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-2.5 py-2 mb-1.5 space-y-1.5">
      {VARIABLES.map((group) => (
        <div key={group.group} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground w-10 shrink-0">{group.group}:</span>
          {group.vars.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onInsert(v.value)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-mono"
            >
              {v.value}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
import {
  leadsService,
  templatesService,
  communicationService,
  LeadResponse,
  FollowupTemplate
} from "@/lib/apis";

export default function SendEmail() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [activeTab, setActiveTab] = useState("email");
  const [isSending, setIsSending] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const customBodyRef = useRef<RichTextEditorRef>(null);
  const smsRef = useRef<HTMLTextAreaElement>(null);
  const whatsappRef = useRef<HTMLTextAreaElement>(null);

  const makePlainInserter = (
    ref: React.RefObject<HTMLTextAreaElement>,
    value: string,
    setValue: (v: string) => void
  ) => (variable: string) => {
    const el = ref.current;
    if (!el) { setValue(value + variable); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + variable + value.slice(end);
    setValue(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  // Timer effect
  useEffect(() => {
    let timer: any;
    if (isSending) {
      setElapsedTime(0);
      timer = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isSending]);

  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSector, setSelectedSector] = useState("all");
  const [cities, setCities] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState("all");

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSelectedLeadIds([]);
      fetchData(searchTerm, selectedSector, selectedCity);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedSector, selectedCity]);

  const fetchData = async (search: string, sector: string = "all", city: string = "all") => {
    setIsLoading(true);
    try {
      const query: any = {
        limit: 1000,
        search: search || undefined
      };

      if (sector !== "all") query.sector = sector;
      if (city !== "all") query.city = city;

      const [leadsData, templatesData, sectorsData, citiesData] = await Promise.all([
        leadsService.getAllLeads(query),
        templatesService.getAllTemplates(),
        leadsService.getSectors(),
        leadsService.getCities(),
      ]);

      setLeads(leadsData.data || []);
      setTemplates(templatesData || []);
      setSectors(sectorsData || []);
      setCities(citiesData || []);
    } catch (error) {
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setCurrentLeadIndex(0);
    setSelectedLeadIds(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleAllLeads = () => {
    setCurrentLeadIndex(0);
    if (selectedLeadIds.length === leads.length && leads.length > 0) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map(l => l.id));
    }
  };

  const selectedLeads = leads.filter(l => selectedLeadIds.includes(l.id));
  const displayLead = selectedLeads.length > 0 ? selectedLeads[currentLeadIndex] ?? selectedLeads[0] : null;

  // All unique sectors from selected leads
  const selectedLeadSectors = Array.from(new Set(selectedLeads.map(l => l.sector).filter(Boolean)));

  // Templates matching any selected lead's sector (or show all if no leads selected)
  const availableTemplates = selectedLeads.length > 0
    ? templates.filter((t) =>
        !t.sector ||
        selectedLeadSectors.includes(t.sector) ||
        t.sector.toLowerCase() === 'general'
      )
    : templates;

  // For a given lead, find the best matching template from the selected ones
  const getTemplateForLead = (lead: LeadResponse): FollowupTemplate | undefined => {
    if (selectedTemplateIds.length === 0) return undefined;
    // First try to find a template matching the lead's sector
    const sectorMatch = selectedTemplateIds
      .map(id => templates.find(t => t.id === id))
      .find(t => t && t.sector === lead.sector);
    if (sectorMatch) return sectorMatch;
    // Fallback: first selected template
    return templates.find(t => t.id === selectedTemplateIds[0]);
  };

  const handleSendEmail = async () => {
    if (selectedLeadIds.length === 0) return;
    setIsSending(true);
    let successCount = 0;
    let failCount = 0;
    let lastFailMessage = "";

    try {
      for (const leadId of selectedLeadIds) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || !lead.email) continue;

        let subject: string;
        let body: string;

        if (useCustom) {
          subject = customSubject;
          body = customBody;
        } else {
          const template = getTemplateForLead(lead);
          subject = template?.subject || "";
          body = template?.body || "";
        }

        if (!body) continue;

        try {
          await communicationService.sendMessage({
            leadId: lead.id,
            type: "email",
            subject,
            content: body,
          });
          successCount++;
          if (selectedLeadIds.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err: unknown) {
          failCount++;
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          if (msg && failCount === 1) lastFailMessage = msg;
        }
      }

      const parts = successCount > 0 ? [`Successfully sent ${successCount} emails`] : [];
      if (failCount > 0) parts.push(`Failed: ${failCount}${lastFailMessage ? ` — ${lastFailMessage}` : ""}`);
      toast({
        title: successCount > 0 ? "Process complete" : "Send failed",
        description: parts.join(". ") || "No emails sent.",
        variant: failCount > 0 && successCount === 0 ? "destructive" : undefined
      });

      if (successCount > 0) {
        setCustomSubject("");
        setCustomBody("");
      }
    } catch (error) {
      toast({ title: "Failed to process emails", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSms = async () => {
    if (selectedLeadIds.length === 0 || !smsMessage) return;
    setIsSending(true);
    let successCount = 0;
    let failCount = 0;
    let lastFailMessage = "";

    try {
      for (const leadId of selectedLeadIds) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || !lead.phoneNumber) continue;

        try {
          await communicationService.sendMessage({
            leadId: lead.id,
            type: "sms",
            content: smsMessage,
          });
          successCount++;
          if (selectedLeadIds.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err: unknown) {
          failCount++;
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          if (msg && failCount === 1) lastFailMessage = msg;
        }
      }
      const parts = successCount > 0 ? [`Successfully sent ${successCount} SMS`] : [];
      if (failCount > 0) parts.push(`Failed: ${failCount}${lastFailMessage ? ` — ${lastFailMessage}` : ""}`);
      toast({
        title: successCount > 0 ? "Process complete" : "Send failed",
        description: parts.join(". ") || "No SMS sent.",
        variant: failCount > 0 && successCount === 0 ? "destructive" : undefined
      });
      if (successCount > 0) setSmsMessage("");
    } catch (error) {
      toast({ title: "Failed to process SMS", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsapp = async () => {
    if (selectedLeadIds.length === 0 || !whatsappMessage) return;
    setIsSending(true);
    let successCount = 0;
    let failCount = 0;
    let lastFailMessage = "";

    try {
      for (const leadId of selectedLeadIds) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead || !lead.phoneNumber) continue;

        try {
          await communicationService.sendMessage({
            leadId: lead.id,
            type: "whatsapp",
            content: whatsappMessage,
          });
          successCount++;
          if (selectedLeadIds.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err: unknown) {
          failCount++;
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
          if (msg && failCount === 1) lastFailMessage = msg;
        }
      }
      const parts = successCount > 0 ? [`Successfully sent ${successCount} WhatsApp messages`] : [];
      if (failCount > 0) parts.push(`Failed: ${failCount}${lastFailMessage ? ` — ${lastFailMessage}` : ""}`);
      toast({
        title: successCount > 0 ? "Process complete" : "Send failed",
        description: parts.join(". ") || "No WhatsApp messages sent.",
        variant: failCount > 0 && successCount === 0 ? "destructive" : undefined
      });
      if (successCount > 0) setWhatsappMessage("");
    } catch (error) {
      toast({ title: "Failed to process WhatsApp messages", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const getPreview = () => {
    let body: string;
    if (useCustom) {
      body = customBody;
    } else {
      const template = displayLead ? getTemplateForLead(displayLead) : templates.find(t => t.id === selectedTemplateIds[0]);
      body = template?.body || "";
    }
    if (!displayLead) return body;
    return body
      .replace(/{{name}}/g, displayLead.name)
      .replace(/{{company}}/g, displayLead.companyName || "your company")
      .replace(/\n/g, '<br />');
  };

  const canSendEmail = (useCustom ? (customSubject && customBody) : selectedTemplateIds.length > 0) && selectedLeadIds.length > 0;
  const canSendSms = selectedLeadIds.length > 0 && smsMessage;
  const canSendWhatsapp = selectedLeadIds.length > 0 && whatsappMessage;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-send-title">
            Send Message
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send email, SMS, or WhatsApp message to multiple leads
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:items-stretch">
          <div className="flex flex-col h-full">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between py-3 gap-2 flex-wrap">
                <CardTitle className="text-base shrink-0">Select Leads</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {cities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedSector} onValueChange={setSelectedSector}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="All Sectors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sectors</SelectItem>
                      {sectors.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-lead"
                  />
                </div>
                <div className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded-md border border-dashed">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedLeadIds.length === leads.length && leads.length > 0}
                      onCheckedChange={toggleAllLeads}
                    />
                    <Label htmlFor="select-all" className="text-xs font-medium cursor-pointer">Select All ({leads.length})</Label>
                  </div>
                  {selectedLeadIds.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">{selectedLeadIds.length} selected</Badge>
                  )}
                </div>

                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-1">
                    {isLoading ? (
                      <div className="py-20 flex justify-center w-full">
                        <InlineLoader text="Loading leads..." />
                      </div>
                    ) : (
                      <>
                        {leads.map((lead) => (
                          <div
                            key={lead.id}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${selectedLeadIds.includes(lead.id) ? "bg-primary/5 border border-primary/10" : "hover:bg-muted"
                              }`}
                            onClick={() => toggleLeadSelection(lead.id)}
                            data-testid={`option-lead-${lead.id}`}
                          >
                            <Checkbox
                              checked={selectedLeadIds.includes(lead.id)}
                              onCheckedChange={() => toggleLeadSelection(lead.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                              {lead.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              {lead.companyName && (
                                <p className="text-[11px] text-muted-foreground truncate">{lead.companyName}</p>
                              )}
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {lead.city && <span className="truncate max-w-[80px]">{lead.city}</span>}
                                {lead.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" /> Email</span>}
                                {lead.phoneNumber && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" /> Phone</span>}
                              </div>
                            </div>
                            {lead.sector && (
                              <Badge variant="outline" className="text-[9px] h-4 shrink-0 px-1">{lead.sector}</Badge>
                            )}
                          </div>
                        ))}
                        {leads.length === 0 && (
                          <div className="py-8 text-center text-muted-foreground">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                            <p className="text-xs">No leads found</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Lead Details</span>
                  {selectedLeads.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground font-normal">
                        {currentLeadIndex + 1} / {selectedLeads.length}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={currentLeadIndex === 0}
                        onClick={() => setCurrentLeadIndex(i => i - 1)}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        disabled={currentLeadIndex === selectedLeads.length - 1}
                        onClick={() => setCurrentLeadIndex(i => i + 1)}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!displayLead ? (
                  <div className="py-12 text-center">
                    <Mail className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Select one or more leads to see details</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-medium">
                        {displayLead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">{displayLead.name}</h3>
                        <p className="text-xs text-muted-foreground">{displayLead.designation || "N/A"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <DetailItem label="Company" value={displayLead.companyName || "N/A"} />
                      <DetailItem label="Email" value={displayLead.email || "N/A"} />
                      <DetailItem label="Phone" value={displayLead.phoneNumber || "N/A"} />
                      <DetailItem label="City" value={displayLead.city || "N/A"} />
                      <DetailItem label="Sector" value={displayLead.sector || "Unassigned"} />
                      <DetailItem label="Status" value={displayLead.leadStatus || "new"} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedLeadIds.length > 0 && (
              <Card className="border-primary/20 shadow-sm">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Compose Message</CardTitle>
                  <Badge variant="default" className="text-[10px] bg-primary/90">
                    <Users className="h-3 w-3 mr-1" />
                    {selectedLeadIds.length} Recipient{selectedLeadIds.length > 1 ? 's' : ''}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full h-8">
                      <TabsTrigger value="email" className="flex-1 text-xs"><Mail className="h-3 w-3 mr-1" /> Email</TabsTrigger>
                      <TabsTrigger value="sms" className="flex-1 text-xs"><MessageSquare className="h-3 w-3 mr-1" /> SMS</TabsTrigger>
                      <TabsTrigger value="whatsapp" className="flex-1 text-xs"><Phone className="h-3 w-3 mr-1" /> WhatsApp</TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-3 mt-3">
                      <div className="flex gap-2">
                        <Button variant={!useCustom ? "default" : "secondary"} size="sm" className="h-7 text-[10px]" onClick={() => setUseCustom(false)}>Use Template</Button>
                        <Button variant={useCustom ? "default" : "secondary"} size="sm" className="h-7 text-[10px]" onClick={() => setUseCustom(true)}>Custom Email</Button>
                      </div>
                      {!useCustom ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Select Templates</Label>
                          <TemplateMultiSelect
                            templates={availableTemplates}
                            selectedIds={selectedTemplateIds}
                            onChange={setSelectedTemplateIds}
                            placeholder="Choose templates…"
                            hint={
                              availableTemplates.length === 0
                                ? "No templates found for selected lead sectors"
                                : selectedTemplateIds.length > 1
                                ? "Each lead receives the template that matches their sector"
                                : undefined
                            }
                            size="sm"
                            data-testid="select-template"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <Label className="text-xs">Subject</Label>
                            <Input className="h-8 text-xs" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} placeholder="Email subject..." />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Message Body</Label>
                            <VariableChips onInsert={(v) => customBodyRef.current?.insertAtCursor(v)} />
                            <RichTextEditor
                              ref={customBodyRef}
                              value={customBody}
                              onChange={setCustomBody}
                              placeholder="Dear {{name}},..."
                              minHeight="120px"
                            />
                          </div>
                        </>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs flex-1" onClick={() => { setPreviewHtml(getPreview()); setShowPreview(true); }} disabled={!canSendEmail}>
                          <Eye className="h-3 w-3 mr-1" /> Preview
                        </Button>
                        <Button size="sm" className="h-8 text-xs flex-1" onClick={handleSendEmail} disabled={!canSendEmail || isSending}>
                          {isSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          {isSending ? `Running... (${elapsedTime}s)` : "Run Now"}
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="sms" className="space-y-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">SMS Message</Label>
                        <VariableChips onInsert={makePlainInserter(smsRef, smsMessage, setSmsMessage)} />
                        <Textarea
                          ref={smsRef}
                          value={smsMessage}
                          onChange={(e) => setSmsMessage(e.target.value)}
                          className="min-h-[80px] text-xs font-mono"
                          placeholder="Dear {{name}}, ..."
                        />
                        <p className="text-[10px] text-muted-foreground text-right">{smsMessage.length}/160</p>
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs" onClick={handleSendSms} disabled={!canSendSms || isSending}>
                        {isSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {isSending ? `Running... (${elapsedTime}s)` : "Run Now"}
                      </Button>
                    </TabsContent>

                    <TabsContent value="whatsapp" className="space-y-3 mt-3">
                      <div className="space-y-1">
                        <Label className="text-xs">WhatsApp Message</Label>
                        <VariableChips onInsert={makePlainInserter(whatsappRef, whatsappMessage, setWhatsappMessage)} />
                        <Textarea
                          ref={whatsappRef}
                          value={whatsappMessage}
                          onChange={(e) => setWhatsappMessage(e.target.value)}
                          className="min-h-[80px] text-xs font-mono"
                          placeholder="Dear {{name}}, ..."
                        />
                      </div>
                      <Button size="sm" className="w-full h-8 text-xs" onClick={handleSendWhatsapp} disabled={!canSendWhatsapp || isSending}>
                        {isSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Phone className="h-3 w-3 mr-1" />}
                        {isSending ? `Running... (${elapsedTime}s)` : "Run Now"}
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>

          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Email Preview</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="p-2.5 bg-muted/50 rounded-md border text-xs">
                  <p className="text-[10px] text-muted-foreground mb-0.5">To:</p>
                  <p className="font-medium">{displayLead?.email}</p>
                </div>
                <div className="p-2.5 bg-muted/50 rounded-md border text-xs">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Subject:</p>
                  <p className="font-medium">
                    {useCustom
                      ? customSubject
                      : (displayLead ? getTemplateForLead(displayLead)?.subject || "" : templates.find(t => t.id === selectedTemplateIds[0])?.subject || "")
                          .replace(/{{name}}/g, displayLead?.name || "")
                          .replace(/{{company}}/g, displayLead?.companyName || "")}
                  </p>
                </div>
                <div className="border rounded-md p-4 text-sm bg-white min-h-[200px]">
                  <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-xs truncate">{value}</p>
    </div>
  );
}
