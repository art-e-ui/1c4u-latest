import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Image as ImageIcon, Layout, Settings, Plus, Edit2, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  name: string;
  type: string;
  lastUpdated: string;
  status: "Published" | "Draft";
}

export default function ContentManagementPage() {
  const sections: Section[] = [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
          <p className="text-sm text-muted-foreground">Manage your website's static pages and dynamic content.</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          New Page
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-theme-sm bg-primary/5">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Layout className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold">Page Builder</h3>
            <p className="text-xs text-muted-foreground mt-1">Drag and drop components to build pages.</p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs">Open Builder</Button>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-sm bg-info/5">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-info/10 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6 text-info" />
            </div>
            <h3 className="font-bold">Media Library</h3>
            <p className="text-xs text-muted-foreground mt-1">Manage images, videos, and documents.</p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs text-info">View Library</Button>
          </CardContent>
        </Card>
        <Card className="border-none shadow-theme-sm bg-warning/5">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Settings className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-bold">SEO Settings</h3>
            <p className="text-xs text-muted-foreground mt-1">Configure meta tags and site indexing.</p>
            <Button variant="link" className="mt-2 h-auto p-0 text-xs text-warning">Edit SEO</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-theme-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Content Items
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Name", "Type", "Last Updated", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left p-3.5 text-xs font-bold text-muted-foreground uppercase tracking-wider first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sections.map((section) => (
                <tr key={section.id} className="hover:bg-accent/50 transition-colors">
                  <td className="p-3.5 pl-5 font-medium">{section.name}</td>
                  <td className="p-3.5 text-muted-foreground">{section.type}</td>
                  <td className="p-3.5 text-muted-foreground">{section.lastUpdated}</td>
                  <td className="p-3.5">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold",
                      section.status === "Published" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                    )}>
                      {section.status}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
