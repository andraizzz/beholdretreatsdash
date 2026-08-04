import { Card, CardContent } from "@/components/ui/card";

export function Placeholder({ label, height = 240 }: { label: string; height?: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div
          className="flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
          style={{ height }}
        >
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-heading text-xl tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
