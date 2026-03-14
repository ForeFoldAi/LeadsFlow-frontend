import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { InlineLoader } from "@/components/ui/loader";
import RichTextEditor, { RichTextEditorRef } from "@/components/ui/rich-text-editor";
import { Plus, FileText, Edit, Trash2, Eye, ChevronDown, Search } from "lucide-react";
import { templatesService, leadsService, FollowupTemplate, TemplateCategory, TEMPLATE_CATEGORY_LABELS } from "@/lib/apis";

export default function Templates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FollowupTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FollowupTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    sectors: [] as string[],
    subject: "",
    body: "",
    type: "email",
    category: TemplateCategory.GENERAL,
  });
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorSearch, setSectorSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);

  const bodyEditorRef = useRef<RichTextEditorRef>(null);
  const { toast } = useToast();

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

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [data, sectors] = await Promise.all([
        templatesService.getAllTemplates(),
        leadsService.getSectors(),
      ]);
      setTemplates(data);
      setAvailableSectors(sectors);
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const groupedBySector = templates.reduce((acc, t) => {
    if (!acc[t.sector]) acc[t.sector] = [];
    acc[t.sector].push(t);
    return acc;
  }, {} as Record<string, FollowupTemplate[]>);

  const openEdit = (t: FollowupTemplate) => {
    setFormData({
      name: t.name,
      sectors: [t.sector],
      subject: t.subject,
      body: t.body,
      type: t.type || "email",
      category: t.category || TemplateCategory.GENERAL,
    });
    setEditTemplate(t);
  };

  const toggleSector = (sector: string) => {
    setFormData((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(sector)
        ? prev.sectors.filter((s) => s !== sector)
        : [...prev.sectors, sector],
    }));
  };

  const handleSave = async () => {
    if (formData.sectors.length === 0) {
      toast({ title: "Please select at least one sector", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      if (editTemplate) {
        // Always update the template being edited (keep its original sector if not in new selection)
        const primarySector = formData.sectors.includes(editTemplate.sector)
          ? editTemplate.sector
          : formData.sectors[0];
        await templatesService.updateTemplate(editTemplate.id, {
          name: formData.name,
          sector: primarySector,
          subject: formData.subject,
          body: formData.body,
          type: formData.type,
          category: formData.category,
        });
        // For every other selected sector, find template with same category in that sector and update it
        const otherSectors = formData.sectors.filter((s) => s !== primarySector);
        if (otherSectors.length > 0) {
          const normalize = (s: string) => (s ?? "").trim().toLowerCase();
          await Promise.all(
            otherSectors.map((sector) => {
              const existing = templates.find(
                (t) =>
                  normalize(t.sector) === normalize(sector) &&
                  normalize(t.category) === normalize(formData.category) &&
                  t.id !== editTemplate.id
              );
              if (existing) {
                return templatesService.updateTemplate(existing.id, {
                  name: formData.name,
                  sector: existing.sector, // keep original sector casing
                  subject: formData.subject,
                  body: formData.body,
                  type: formData.type,
                  category: formData.category,
                });
              } else {
                return templatesService.createTemplate({
                  name: formData.name,
                  sector,
                  subject: formData.subject,
                  body: formData.body,
                  type: formData.type,
                  category: formData.category,
                });
              }
            })
          );
        }
        toast({ title: formData.sectors.length > 1 ? `Updated ${formData.sectors.length} templates` : "Template updated" });
        setEditTemplate(null);
      } else if (formData.sectors.length > 1) {
        await templatesService.bulkCreateTemplates({
          name: formData.name,
          sectors: formData.sectors,
          subject: formData.subject,
          body: formData.body,
          type: formData.type,
          category: formData.category,
        });
        toast({ title: `${formData.sectors.length} templates created (one per sector)` });
        setIsCreateOpen(false);
      } else {
        await templatesService.createTemplate({
          name: formData.name,
          sector: formData.sectors[0],
          subject: formData.subject,
          body: formData.body,
          type: formData.type,
          category: formData.category,
        });
        toast({ title: "Template created successfully" });
        setIsCreateOpen(false);
      }
      setFormData({ name: "", sectors: [], subject: "", body: "", type: "email", category: TemplateCategory.GENERAL });
      fetchData();
    } catch (err) {
      console.error("handleSave error:", err);
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await templatesService.deleteTemplate(id);
      toast({ title: "Template deleted" });
      fetchData();
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const resetAndOpen = () => {
    setFormData({ name: "", sectors: [], subject: "", body: "", type: "email", category: TemplateCategory.GENERAL });
    setIsCreateOpen(true);
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-templates-title">
              Email Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage sector-specific email templates for lead outreach
            </p>
          </div>
          <Button onClick={resetAndOpen} data-testid="button-create-template">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center w-full">
            <InlineLoader text="Loading templates..." />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first email template to start automating outreach</p>
              <Button onClick={resetAndOpen} data-testid="button-create-first-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-6">
              {Object.entries(groupedBySector).sort().map(([sector, sectorTemplates]) => (
                <div key={sector}>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{sector}</h2>
                    <Badge variant="outline" className="text-xs">{sectorTemplates.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {sectorTemplates.map((template) => (
                      <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <p className="text-sm font-semibold leading-tight line-clamp-1 flex-1">{template.name}</p>
                            <div className="flex items-center gap-0 shrink-0 -mr-1">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setPreviewTemplate(template)} data-testid={`button-preview-${template.id}`}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEdit(template)} data-testid={`button-edit-${template.id}`}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(template.id)} data-testid={`button-delete-${template.id}`}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{template.subject}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{template.sector}</Badge>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium
                              ${template.category === "general" ? "bg-slate-100 text-slate-600" :
                                template.category === "focused_template" ? "bg-blue-100 text-blue-700" :
                                template.category === "followup_template" ? "bg-amber-100 text-amber-700" :
                                "bg-muted text-muted-foreground"}`}>
                              {TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={isCreateOpen || !!editTemplate} onOpenChange={() => { setIsCreateOpen(false); setEditTemplate(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Introduction Email"
                    data-testid="input-template-name"
                  />
                </div>

                {/* Multi-sector with checkboxes */}
                <div>
                  <Label>Sector</Label>
                  <Popover open={sectorOpen} onOpenChange={(o) => { setSectorOpen(o); if (!o) setSectorSearch(""); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal h-10 text-sm"
                        data-testid="select-template-sector"
                      >
                        <span className="truncate text-left">
                          {formData.sectors.length === 0
                            ? <span className="text-muted-foreground">Select sectors</span>
                            : formData.sectors.length === 1
                            ? formData.sectors[0]
                            : `${formData.sectors.length} sectors`}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                      <div className="flex items-center gap-2 px-3 py-2 border-b">
                        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <input
                          className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                          placeholder="Search sectors…"
                          value={sectorSearch}
                          onChange={(e) => setSectorSearch(e.target.value)}
                        />
                      </div>
                      <div
                        className="overflow-y-auto"
                        style={{ maxHeight: 224, overscrollBehavior: "contain" }}
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {availableSectors.filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase())).length === 0 ? (
                          <p className="text-xs text-muted-foreground px-3 py-4 text-center">No sectors found</p>
                        ) : (
                          <div className="py-1">
                            {availableSectors
                              .filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase()))
                              .map((sector) => (
                                <label
                                  key={sector}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-muted cursor-pointer text-sm select-none"
                                >
                                  <Checkbox
                                    checked={formData.sectors.includes(sector)}
                                    onCheckedChange={() => toggleSector(sector)}
                                  />
                                  {sector}
                                </label>
                              ))}
                          </div>
                        )}
                      </div>
                      {formData.sectors.length > 0 && (
                        <div className="border-t px-3 py-2">
                          <p className="text-xs text-muted-foreground">
                            {formData.sectors.length} selected → {formData.sectors.length} template{formData.sectors.length > 1 ? "s" : ""} will be created
                          </p>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as TemplateCategory })}>
                    <SelectTrigger data-testid="select-template-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TemplateCategory).map((cat) => (
                        <SelectItem key={cat} value={cat}>{TEMPLATE_CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject"
                  data-testid="input-template-subject"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">Body</Label>
                <div className="rounded-md border border-border bg-muted/40 px-3 py-2 mb-2 space-y-2">
                  {VARIABLES.map((group) => (
                    <div key={group.group} className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground w-14 shrink-0">{group.group}:</span>
                      {group.vars.map((v) => (
                        <button
                          key={v.value}
                          type="button"
                          onClick={() => bodyEditorRef.current?.insertAtCursor(v.value)}
                          className="text-xs px-2 py-1 rounded-md bg-background border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-mono"
                        >
                          {v.value}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <RichTextEditor
                  ref={bodyEditorRef}
                  value={formData.body}
                  onChange={(html) => setFormData((prev) => ({ ...prev, body: html }))}
                  placeholder="Dear {{name}}, I wanted to reach out to {{company}}..."
                  minHeight="220px"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setIsCreateOpen(false); setEditTemplate(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || formData.sectors.length === 0 || !formData.subject || !formData.body || isSaving}
                data-testid="button-save-template"
              >
                {isSaving
                  ? "Saving..."
                  : editTemplate
                  ? "Save Changes"
                  : `Create${formData.sectors.length > 1 ? ` (${formData.sectors.length})` : ""}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl">
            {previewTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle>Preview: {previewTemplate.name}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <div className="mb-3 p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">Subject:</p>
                    <p className="text-sm font-medium">{previewTemplate.subject}</p>
                  </div>
                  <div className="border rounded-md p-4">
                    <div dangerouslySetInnerHTML={{ __html: previewTemplate.body }} />
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
