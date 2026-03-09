"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, UserX, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { updateReportStatus, suspendUser, unsuspendUser } from "@/app/actions/reports";
import Link from "next/link";

interface Report {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  resolution: string | null;
  reporter: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
  };
  reported: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar: string | null;
    status: string;
  };
}

interface AdminReportsViewProps {
  initialReports: Report[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function AdminReportsView({ initialReports, nextCursor, hasMore }: AdminReportsViewProps) {
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [isLoading, setIsLoading] = useState(false);

  // Action dialog state
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionType, setActionType] = useState<"status" | "suspend" | "unsuspend">("status");
  const [newStatus, setNewStatus] = useState<string>("");
  const [resolution, setResolution] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500";
      case "INVESTIGATING":
        return "bg-blue-500";
      case "RESOLVED":
        return "bg-green-500";
      case "DISMISSED":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      SPAM: "Spam",
      HARASSMENT: "Harassment",
      INAPPROPRIATE_CONTENT: "Inappropriate Content",
      IMPERSONATION: "Impersonation",
      FALSE_INFORMATION: "False Information",
      OTHER: "Other",
    };
    return labels[reason] || reason;
  };

  const handleOpenActionDialog = (report: Report, type: "status" | "suspend" | "unsuspend") => {
    setSelectedReport(report);
    setActionType(type);
    setNewStatus(type === "status" ? report.status : "");
    setResolution("");
    setActionError(null);
    setActionDialogOpen(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedReport) return;

    setIsLoading(true);
    setActionError(null);

    let result;

    if (actionType === "suspend") {
      result = await suspendUser(selectedReport.reported.id, resolution);
    } else if (actionType === "unsuspend") {
      result = await unsuspendUser(selectedReport.reported.id);
    } else {
      if (!newStatus) {
        setActionError("Please select a status");
        setIsLoading(false);
        return;
      }
      result = await updateReportStatus({
        reportId: selectedReport.id,
        status: newStatus as any,
        resolution: resolution || undefined,
      });
    }

    if (result.error) {
      setActionError(result.error);
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setActionDialogOpen(false);
      router.refresh();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Reports</h1>
        <p className="text-gray-400">Review and manage user reports</p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No reports found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="bg-black border-neutral-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Badge variant="outline">{getReasonLabel(report.reason)}</Badge>
                    </div>
                    <CardTitle className="text-base">
                      Report #{report.id.slice(0, 8)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Submitted {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reporter */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Reported by</p>
                  <Link href={`/u/${report.reporter.handle}`} className="flex items-center gap-2 hover:underline">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-neutral-900 text-white text-xs">
                        {report.reporter.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{report.reporter.name}</p>
                      <p className="text-xs text-muted-foreground">@{report.reporter.handle}</p>
                    </div>
                  </Link>
                </div>

                {/* Reported User */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Reported user</p>
                  <Link href={`/u/${report.reported.handle}`} className="flex items-center gap-2 hover:underline">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-neutral-900 text-white text-xs">
                        {report.reported.name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="text-sm font-medium">{report.reported.name}</p>
                        <p className="text-xs text-muted-foreground">@{report.reported.handle}</p>
                      </div>
                      {report.reported.status === "SUSPENDED" && (
                        <Badge variant="destructive" className="text-xs">SUSPENDED</Badge>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Description */}
                {report.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Details</p>
                    <p className="text-sm bg-neutral-900 p-3 rounded">{report.description}</p>
                  </div>
                )}

                {/* Resolution */}
                {report.resolution && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Resolution</p>
                    <p className="text-sm bg-neutral-900 p-3 rounded">{report.resolution}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenActionDialog(report, "status")}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Update Status
                  </Button>
                  {report.reported.status === "SUSPENDED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenActionDialog(report, "unsuspend")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Unsuspend User
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleOpenActionDialog(report, "suspend")}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Suspend User
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "suspend"
                ? "Suspend User"
                : actionType === "unsuspend"
                ? "Unsuspend User"
                : "Update Report Status"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "suspend"
                ? "This will prevent the user from accessing the platform."
                : actionType === "unsuspend"
                ? "This will restore the user's access to the platform."
                : "Update the status of this report."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionType === "status" && (
              <div className="space-y-2">
                <Label>New Status *</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="DISMISSED">Dismissed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>
                {actionType === "suspend" ? "Reason" : "Notes"} (Optional)
              </Label>
              <Textarea
                placeholder={
                  actionType === "suspend"
                    ? "Explain why this user is being suspended..."
                    : "Add any notes about your decision..."
                }
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>
            {actionError && (
              <p className="text-sm text-destructive">{actionError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
                setActionError(null);
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAction}
              disabled={isLoading || (actionType === "status" && !newStatus)}
              variant={actionType === "suspend" ? "destructive" : "default"}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : actionType === "suspend" ? (
                "Suspend User"
              ) : actionType === "unsuspend" ? (
                "Unsuspend User"
              ) : (
                "Update Status"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
