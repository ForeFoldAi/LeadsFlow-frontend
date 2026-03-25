import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Mail, CheckCircle, XCircle, Clock, Eye, MessageSquare, Phone, MinusCircle } from "lucide-react";
import { InlineLoader } from "@/components/ui/loader";
import { communicationService, CommunicationLog } from "@/lib/apis";

/** Parse API timestamp as UTC and format in user's local timezone (matches Gmail time). */
function formatSentAt(sentAt: string | number | null | undefined): string {
  if (sentAt == null) return "-";
  let s = String(sentAt).trim();
  if (!s) return "-";
  // Numeric = Unix ms
  if (/^\d+$/.test(s)) return new Date(Number(s)).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
  // Normalize "YYYY-MM-DD HH:mm:ss" to ISO so appending Z parses as UTC
  if (/^\d{4}-\d{2}-\d{2}\s\d/.test(s)) s = s.replace(" ", "T");
  const hasTz = s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s);
  const isoUtc = hasTz ? s : s + "Z";
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
}

export default function CommunicationLogs() {
  const [viewLog, setViewLog] = useState<CommunicationLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);


  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await communicationService.getAllLogs();
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statusIcon = (status: string | null) => {
    switch (status) {
      case "sent":
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "skipped":
        return <MinusCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "sent":
      case "delivered":
        return "default";
      case "failed":
        return "destructive";
      case "skipped":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-logs-title">
            Communication Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            History of all messages sent to leads
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 flex justify-center w-full">
                <InlineLoader text="Loading logs..." />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No communication history</h3>
                <p className="text-sm text-muted-foreground">
                  Messages you send (email, SMS, WhatsApp) will appear here
                </p>
              </div>
            ) : (
              <>
                {/* Mobile card list */}
                <div className="sm:hidden divide-y">
                  {logs.map((log) => {
                    const channel = log.type || log.channel;
                    return (
                      <div
                        key={log.id}
                        className="p-4 flex items-start gap-3"
                        data-testid={`row-log-${log.id}`}
                      >
                        <div className="mt-0.5 shrink-0">{statusIcon(log.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{log.lead?.name || "Unknown"}</p>
                            <Badge variant="outline" className="text-xs uppercase flex items-center">
                              {channel === "sms" ? <MessageSquare className="h-3 w-3 mr-1" /> :
                                channel === "whatsapp" ? <Phone className="h-3 w-3 mr-1" /> :
                                  <Mail className="h-3 w-3 mr-1" />}
                              {channel}
                            </Badge>
                            <Badge variant={statusVariant(log.status)} className="text-xs">
                              {log.status || "pending"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{log.companyName || ""}</p>
                          <p className="text-sm truncate font-medium mt-1">
                            {log.subject || (channel === "email" ? "No Subject" : "Message Content")}
                          </p>
                          {log.errorMessage && (
                            <p className="text-xs text-destructive truncate mt-0.5">
                              {log.errorMessage}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatSentAt(log.sentAt)}
                          </p>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => setViewLog(log)}
                          data-testid={`button-view-log-${log.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block">
                  <ScrollArea className="h-[calc(100vh-220px)]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Subject / Content</TableHead>
                          <TableHead>Sent At</TableHead>
                          <TableHead className="w-[60px]">View</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => {
                          const channel = log.type || log.channel;
                          return (
                            <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {statusIcon(log.status)}
                                  <Badge variant={statusVariant(log.status)}>
                                    {log.status || "pending"}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{log.lead?.name || "Unknown"}</p>
                                  <p className="text-xs text-muted-foreground">{log.companyName || ""}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs uppercase">
                                  {channel === "sms" ? <MessageSquare className="h-3 w-3 mr-1" /> :
                                    channel === "whatsapp" ? <Phone className="h-3 w-3 mr-1" /> :
                                      <Mail className="h-3 w-3 mr-1" />}
                                  {channel}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[250px]">
                                <p className="text-sm truncate font-medium">{log.subject || (channel === "email" ? "No Subject" : "Message Content")}</p>
                                {log.errorMessage
                                  ? <p className="text-xs text-destructive truncate">{log.errorMessage}</p>
                                  : <p className="text-xs text-muted-foreground truncate">{log.content || ""}</p>
                                }
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatSentAt(log.sentAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => setViewLog(log)}
                                    data-testid={`button-view-log-${log.id}`}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!viewLog} onOpenChange={() => setViewLog(null)}>
          <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
            {viewLog && (
              <>
                <DialogHeader>
                  <DialogTitle>{(viewLog.type || viewLog.channel) === "sms" ? "SMS" : (viewLog.type || viewLog.channel) === "whatsapp" ? "WhatsApp" : "Email"} Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(viewLog.status)}
                    <Badge variant={statusVariant(viewLog.status)}>
                      {viewLog.status || "pending"}
                    </Badge>
                    <Badge variant="outline" className="uppercase">
                      {(viewLog.type || viewLog.channel) === "sms" ? <MessageSquare className="h-3 w-3 mr-1" /> :
                        (viewLog.type || viewLog.channel) === "whatsapp" ? <Phone className="h-3 w-3 mr-1" /> :
                          <Mail className="h-3 w-3 mr-1" />}
                      {viewLog.type || viewLog.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatSentAt(viewLog.sentAt)}
                    </span>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">To:</p>
                    <p className="text-sm font-medium">
                      {viewLog.lead?.name} ({viewLog.lead?.email || viewLog.lead?.phoneNumber})
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground">From:</p>
                    <p className="text-sm">
                      {viewLog.user?.fullName} ({viewLog.companyName})
                    </p>
                  </div>
                  {viewLog.subject && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">Subject:</p>
                      <p className="text-sm font-medium">{viewLog.subject}</p>
                    </div>
                  )}
                  {(viewLog.content || viewLog.body) && (
                    <div className="border rounded-md p-4">
                      {(viewLog.type || viewLog.channel) === "email" ? (
                        <div dangerouslySetInnerHTML={{ __html: viewLog.content || viewLog.body || "" }} />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{viewLog.content || viewLog.body}</p>
                      )}
                    </div>
                  )}
                  {viewLog.errorMessage && (
                    <div className="p-3 bg-destructive/10 rounded-md border border-destructive/20">
                      <p className="text-xs text-destructive font-medium">Error:</p>
                      <p className="text-sm text-destructive">{viewLog.errorMessage}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}