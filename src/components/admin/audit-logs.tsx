import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuditLogs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Logs</CardTitle>
        <CardDescription>View system activity and changes</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Audit log features coming soon...</p>
      </CardContent>
    </Card>
  );
}
