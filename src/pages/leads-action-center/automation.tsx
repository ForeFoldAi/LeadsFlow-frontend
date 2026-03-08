import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { InlineLoader } from "@/components/ui/loader";
import {
  Calendar,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Play,
  Trash2,
  Loader2,
  Users,
  Zap,
  CheckCircle,
} from "lucide-react";
import {
  automationService,
  analyticsService,
  templatesService,
  AutomationSchedule,
  FollowupTemplate,
  AnalyticsResponse
} from "@/lib/apis";

const channelIcons: Record<string, any> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

const channelColors: Record<string, { text: string; bg: string }> = {
  email: { text: "text-blue-600", bg: "bg-blue-100" },
  sms: { text: "text-emerald-600", bg: "bg-emerald-100" },
  whatsapp: { text: "text-green-600", bg: "bg-green-100" },
};

const frequencyLabels: Record<string, string> = {
  daily: "Every Day",
  weekly: "Every Week",
  custom: "Custom Days",
};

export default function Automation() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const [schedules, setSchedules] = useState<AutomationSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<AnalyticsResponse | null>(null);
  const [templates, setTemplates] = useState<FollowupTemplate[]>([]);

  const [formName, setFormName] = useState("");
  const [formChannel, setFormChannel] = useState("email");
  const [formFrequency, setFormFrequency] = useState("daily");
  const [formTime, setFormTime] = useState("09:00");
  const [formDays, setFormDays] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formSmsMessage, setFormSmsMessage] = useState("");
  const [formWhatsappMessage, setFormWhatsappMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (runningScheduleId) {
      setElapsedTime(0);
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningScheduleId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function fetchData() {
    setIsLoading(true);
    try {
      const [schedulesData, analyticsData, templatesData] = await Promise.all([
        automationService.getAllSchedules(),
        analyticsService.getAnalyticsLast30Days(),
        templatesService.getAllTemplates()
      ]);
      setSchedules(schedulesData);
      setStats(analyticsData);
      setTemplates(templatesData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ title: "Failed to load automation data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setFormName("");
    setFormChannel("email");
    setFormFrequency("daily");
    setFormTime("09:00");
    setFormDays("");
    setFormTemplateId("");
    setFormSmsMessage("");
    setFormWhatsappMessage("");
  }

  async function handleCreate() {
    if (!formName.trim()) {
      toast({ title: "Please enter a schedule name", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await automationService.createSchedule({
        name: formName,
        channel: formChannel,
        frequency: formFrequency,
        time: formTime,
        days: formFrequency === "custom" ? formDays : undefined,
        templateId: formChannel === "email" && formTemplateId ? formTemplateId : undefined,
        smsMessage: formChannel === "sms" ? formSmsMessage : undefined,
        whatsappMessage: formChannel === "whatsapp" ? formWhatsappMessage : undefined,
        targetFilter: "due_followup",
      });

      toast({ title: "Schedule created" });
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({ title: "Failed to create schedule", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleSchedule(id: string, isActive: boolean) {
    try {
      await automationService.updateSchedule(id, { isActive });
      setSchedules(schedules.map((s) => (s.id === id ? { ...s, isActive } : s)));
      toast({ title: `Schedule ${isActive ? "activated" : "paused"}` });
    } catch (error) {
      toast({ title: "Failed to update schedule", variant: "destructive" });
    }
  }

  async function deleteSchedule(id: string) {
    try {
      await automationService.deleteSchedule(id);
      setSchedules(schedules.filter((s) => s.id !== id));
      toast({ title: "Schedule deleted" });
    } catch (error) {
      toast({ title: "Failed to delete schedule", variant: "destructive" });
    }
  }

  async function runSchedule(id: string) {
    setRunningScheduleId(id);
    try {
      const result = await automationService.runSchedule(id);

      // Refresh schedules to update lastRunAt
      const updatedSchedules = await automationService.getAllSchedules();
      setSchedules(updatedSchedules);

      toast({
        title: "Run complete",
        description: `${result.processed} processed, ${result.failed} failed`,
      });
    } catch (error) {
      toast({ title: "Failed to run schedule", variant: "destructive" });
    } finally {
      setRunningScheduleId(null);
    }
  }

  const summaryCards = [
    {
      title: "Active Schedules",
      value: schedules.filter((s) => s.isActive).length,
      icon: Calendar,
      sub: `${schedules.length} total`,
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
    {
      title: "Due Follow-ups",
      value: stats?.followupTimeline.dueThisWeek ?? "-",
      icon: Clock,
      sub: `${stats?.followupTimeline.overdue ?? 0} overdue`,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Converted Leads",
      value: stats?.basicMetrics.convertedLeads ?? 0,
      icon: Zap,
      sub: `${stats?.basicMetrics.conversionRate.toFixed(1) ?? 0}% rate`,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Leads",
      value: stats?.basicMetrics.totalLeads ?? "-",
      icon: Users,
      sub: "Across all sources",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-schedulers-title">
              Schedulers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create automated schedules for email, SMS, and WhatsApp outreach
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-schedule">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Schedule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Schedule Name</Label>
                  <Input
                    placeholder="e.g., Daily Email Followup"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    data-testid="input-schedule-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Channel</Label>
                    <Select value={formChannel} onValueChange={setFormChannel}>
                      <SelectTrigger data-testid="select-channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select value={formFrequency} onValueChange={setFormFrequency}>
                      <SelectTrigger data-testid="select-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      data-testid="input-schedule-time"
                    />
                  </div>
                  {formFrequency === "custom" && (
                    <div>
                      <Label>Days (comma-separated)</Label>
                      <Input
                        placeholder="Mon, Wed, Fri"
                        value={formDays}
                        onChange={(e) => setFormDays(e.target.value)}
                        data-testid="input-schedule-days"
                      />
                    </div>
                  )}
                </div>

                {formChannel === "email" && (
                  <div>
                    <Label>Email Template</Label>
                    <Select value={formTemplateId || "auto"} onValueChange={(v) => setFormTemplateId(v === "auto" ? "" : v)}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Auto-select by sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-select by sector</SelectItem>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.sector})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-select picks the best template matching each lead's sector
                    </p>
                  </div>
                )}

                {formChannel === "sms" && (
                  <div>
                    <Label>SMS Message Template</Label>
                    <Textarea
                      placeholder="Hi {{name}}, following up regarding {{company}}..."
                      value={formSmsMessage}
                      onChange={(e) => setFormSmsMessage(e.target.value)}
                      rows={3}
                      data-testid="textarea-sms-message"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{name}}"} and {"{{company}}"} for personalization
                    </p>
                  </div>
                )}

                {formChannel === "whatsapp" && (
                  <div>
                    <Label>WhatsApp Message Template</Label>
                    <Textarea
                      placeholder="Hi {{name}}, following up regarding {{company}}..."
                      value={formWhatsappMessage}
                      onChange={(e) => setFormWhatsappMessage(e.target.value)}
                      rows={3}
                      data-testid="textarea-whatsapp-message"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {"{{name}}"} and {"{{company}}"} for personalization
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  data-testid="button-create-schedule"
                >
                  Create Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((stat) => (
            <Card key={stat.title} className="border border-border/60 shadow-sm">
              <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1" data-testid={`stat-${stat.title.toLowerCase().replace(/\s/g, "-")}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                  </div>
                  <div className={`${stat.bgColor} h-10 w-10 rounded-full flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Schedules</h2>

          {isLoading ? (
            <div className="py-20 flex justify-center w-full">
              <InlineLoader text="Loading schedules..." />
            </div>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium mb-1">No schedules yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first automated outreach schedule
                </p>
                <Button variant="outline" onClick={() => setDialogOpen(true)} data-testid="button-create-first">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {schedules.map((schedule) => {
                const ChannelIcon = channelIcons[schedule.channel] || Mail;
                const colors = channelColors[schedule.channel] || channelColors.email;
                const isRunning = runningScheduleId === schedule.id;

                return (
                  <Card
                    key={schedule.id}
                    className={`border transition-colors ${schedule.isActive ? "border-border/60" : "border-border/30 opacity-60"}`}
                    data-testid={`card-schedule-${schedule.id}`}
                  >
                    <CardContent className="pt-5 pb-4 px-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`${colors.bg} h-10 w-10 rounded-full flex items-center justify-center shrink-0`}>
                            <ChannelIcon className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{schedule.name}</h3>
                            <p className="text-xs text-muted-foreground capitalize">{schedule.channel}</p>
                          </div>
                        </div>
                        <Switch
                          checked={schedule.isActive ?? false}
                          onCheckedChange={(checked) => toggleSchedule(schedule.id, checked)}
                          data-testid={`switch-schedule-${schedule.id}`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {frequencyLabels[schedule.frequency] || schedule.frequency} at {schedule.time}
                            {schedule.days && ` (${schedule.days})`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>Targets: Leads due for followup</span>
                        </div>
                        {schedule.lastRunAt && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                            <span>Last run: {new Date(schedule.lastRunAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => runSchedule(schedule.id)}
                          disabled={isRunning || !schedule.isActive}
                          data-testid={`button-run-${schedule.id}`}
                        >
                          {isRunning ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Running... ({formatTime(elapsedTime)})
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5 mr-1.5" />
                              Run Now
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteSchedule(schedule.id)}
                          data-testid={`button-delete-${schedule.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}