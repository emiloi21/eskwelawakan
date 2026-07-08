import { Sparkles } from 'lucide-react';

export function AiInsightItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="group relative flex gap-4 rounded-lg border border-border bg-background/50 p-4 transition-all hover:bg-background hover:shadow-sm">
      <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-1">
        <h4 className="font-sans text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h4>
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>
    </div>
  );
}