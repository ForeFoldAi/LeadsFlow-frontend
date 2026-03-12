import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { InlineLoader } from "@/components/ui/loader";
import { Plus, FileText, Edit, Trash2, Eye } from "lucide-react";
import { templatesService, FollowupTemplate, TemplateCategory, TEMPLATE_CATEGORY_LABELS } from "@/lib/apis";

const SECTORS = [
  "Roller Flour Mills",
  "Financial Services",
  "Industrials",
  "FMCG + Cold Chain",
  "Educational Institution",
  "Pharmaceuticals",
  "Logistics",
  "Industrials - Solar",
  "Interior Design & Build Services",
  "Real Estate - Plots",
  "Property Management",
];

export default function Templates() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<FollowupTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<FollowupTemplate | null>(null);
  const [formData, setFormData] = useState({ name: "", sector: "", subject: "", body: "", type: "email", category: TemplateCategory.GENERAL });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);

  const bodyRef = useRef<HTMLTextAreaElement>(null);
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

  const insertVariable = (variable: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? formData.body.length;
    const end = el.selectionEnd ?? formData.body.length;
    const newBody = formData.body.slice(0, start) + variable + formData.body.slice(end);
    setFormData({ ...formData, body: newBody });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await templatesService.getAllTemplates();
      setTemplates(data);
    } catch (error) {
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
    setFormData({ name: t.name, sector: t.sector, subject: t.subject, body: t.body, type: t.type || "email", category: t.category || TemplateCategory.GENERAL });
    setEditTemplate(t);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editTemplate) {
        await templatesService.updateTemplate(editTemplate.id, formData);
        toast({ title: "Template updated successfully" });
        setEditTemplate(null);
      } else {
        await templatesService.createTemplate(formData);
        toast({ title: "Template created successfully" });
        setIsCreateOpen(false);
      }
      setFormData({ name: "", sector: "", subject: "", body: "", type: "email", category: TemplateCategory.GENERAL });
      fetchTemplates();
    } catch (error) {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await templatesService.deleteTemplate(id);
      toast({ title: "Template deleted" });
      fetchTemplates();
    } catch (error) {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
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
          <Button onClick={() => { setFormData({ name: "", sector: "", subject: "", body: "", type: "email", category: TemplateCategory.GENERAL }); setIsCreateOpen(true); }} data-testid="button-create-template">
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
              <Button onClick={() => { setFormData({ name: "", sector: "", subject: "", body: "", type: "email", category: TemplateCategory.GENERAL }); setIsCreateOpen(true); }} data-testid="button-create-first-template">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sectorTemplates.map((template) => (
                      <Card key={template.id} className="hover-elevate" data-testid={`card-template-${template.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" onClick={() => setPreviewTemplate(template)} data-testid={`button-preview-${template.id}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(template)} data-testid={`button-edit-${template.id}`}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={() => handleDelete(template.id)} data-testid={`button-delete-${template.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <Badge variant="outline" className="text-xs">{TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                          <p className="text-sm mb-2 font-medium">{template.subject}</p>
                          <p className="text-xs text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: template.body.replace(/<[^>]*>/g, ' ').slice(0, 200) }} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <Dialog open={isCreateOpen || !!editTemplate} onOpenChange={() => { setIsCreateOpen(false); setEditTemplate(null); }}>
          <DialogContent className="max-w-2xl">
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
                <div>
                  <Label>Sector</Label>
                  <Select value={formData.sector} onValueChange={(v) => setFormData({ ...formData, sector: v })}>
                    <SelectTrigger data-testid="select-template-sector">
                      <SelectValue placeholder="Select sector" />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          onClick={() => insertVariable(v.value)}
                          className="text-xs px-2 py-1 rounded-md bg-background border border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-mono"
                        >
                          {v.value}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
                <Textarea
                  ref={bodyRef}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Dear {{name}}&#10;I wanted to reach out to {{company}}..."
                  className="min-h-[200px] font-mono text-sm"
                  data-testid="input-template-body"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => { setIsCreateOpen(false); setEditTemplate(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.name || !formData.sector || !formData.subject || !formData.body || isSaving}
                data-testid="button-save-template"
              >
                {isSaving ? "Saving..." : "Save Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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