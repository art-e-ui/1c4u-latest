import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Archive, Inbox, Send } from "lucide-react";

const DEPARTMENTS = [
  "Finance",
  "Technical",
  "Administration",
  "Human Resources",
  "Marketing",
  "Customer Support",
  "Logistics",
  "Legal",
];

export default function BroadcastNewsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Form state
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [department, setDepartment] = useState("");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["broadcast_notifications", showArchived],
    queryFn: async () => {
      const q = query(
        collection(db, "broadcast_notifications"),
        where("is_archived", "==", showArchived),
        orderBy("broadcast_date", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; label: string; message: string; department: string; is_archived: boolean; broadcast_date: string }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await addDoc(collection(db, "broadcast_notifications"), {
        label,
        message,
        department,
        is_archived: false,
        broadcast_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_notifications"] });
      toast({ title: "Notification broadcast successfully" });
      setCreateOpen(false);
      setLabel("");
      setMessage("");
      setDepartment("");
    },
    onError: (e: unknown) => {
      const message = e instanceof Error ? e.message : "An error occurred";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await updateDoc(doc(db, "broadcast_notifications", id), {
        is_archived: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcast_notifications"] });
      toast({ title: "Notification archived" });
    },
  });

  const handleSubmit = () => {
    if (!label.trim() || !message.trim() || !department) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Broadcast News & Updates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and manage system-wide notifications
        </p>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create New Notification
        </Button>
        <Button
          variant={showArchived ? "default" : "outline"}
          onClick={() => setShowArchived(!showArchived)}
          className="gap-2"
        >
          {showArchived ? <Inbox className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {showArchived ? "Active Notifications" : "Old Notifications"}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead className="w-[160px]">Broadcast Date</TableHead>
              <TableHead className="w-[200px]">Label</TableHead>
              <TableHead>Message</TableHead>
              <TableHead className="w-[180px]">Released By</TableHead>
              {!showArchived && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : notifications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {showArchived ? "No archived notifications" : "No active notifications yet"}
                </TableCell>
              </TableRow>
            ) : (
              notifications.map((n, idx) => (
                <TableRow key={n.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {String(idx + 1).padStart(3, "0")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {new Date(n.broadcast_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{n.label}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                    {n.message}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {n.department}
                    </Badge>
                  </TableCell>
                  {!showArchived && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archiveMutation.mutate(n.id)}
                        title="Archive"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Notification Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-lg">Create New Notification</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-5 py-4 overflow-y-auto">
            {/* Header */}
            <div className="space-y-2">
              <Label htmlFor="notif-label">Notification Header</Label>
              <Input
                id="notif-label"
                placeholder="e.g. Scheduled Maintenance Notice"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="notif-message">Body Message</Label>
              <Textarea
                id="notif-message"
                placeholder="Write the notification body here..."
                className="min-h-[180px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Footer */}
            <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-sm font-medium text-foreground">Released By</p>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {department && (
                <p className="text-xs text-muted-foreground">
                  {department}@1-cartforu.com
                </p>
              )}
            </div>
          </div>

          <SheetFooter className="pt-4 border-t border-border">
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="w-full gap-2"
            >
              <Send className="h-4 w-4" />
              {createMutation.isPending ? "Broadcasting..." : "Broadcast Notification"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
