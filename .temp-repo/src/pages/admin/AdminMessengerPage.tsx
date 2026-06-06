import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Send, MoreHorizontal, Phone, Video, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function AdminMessengerPage() {
  const contacts: { id: string; name: string; online: boolean; time: string; lastMessage: string; unread: number }[] = [];

  const messages: Record<string, unknown>[] = [];

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col sm:flex-row gap-4 animate-fade-in">
      {/* Sidebar */}
      <Card className="w-full sm:w-80 border-none shadow-theme-sm flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Messages</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search chats..." className="bg-transparent border-none outline-none text-sm w-full h-6 focus-visible:ring-0 p-0 shadow-none" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.map((contact) => (
            <div key={contact.id} className="p-4 flex items-center gap-3 hover:bg-accent/50 cursor-pointer transition-colors border-b last:border-0 relative">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {contact.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </div>
                {contact.online && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-bold text-foreground truncate">{contact.name}</span>
                  <span className="text-[10px] text-muted-foreground">{contact.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
              </div>
              {contact.unread > 0 && (
                <span className="h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {contact.unread}
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 border-none shadow-theme-sm flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              -
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Select a contact</h3>
              <span className="text-[10px] text-muted-foreground font-medium">Offline</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Info className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">No messages to display.</p>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-card">
          <div className="flex items-center gap-2">
            <Input placeholder="Type a message..." className="flex-1 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10" />
            <Button size="icon" className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
