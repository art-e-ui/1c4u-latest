import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SiteFrontAdvertisingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Site Front Advertising</h1>
      <Card>
        <CardHeader>
          <CardTitle>Manage Advertisements</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Configure advertisements for the site's front page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
