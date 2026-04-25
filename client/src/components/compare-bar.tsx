import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Scale, X } from "lucide-react";
import { useCompareCart } from "@/hooks/use-compare-cart";

export function CompareBar() {
  const { ids, remove, clear } = useCompareCart();

  if (ids.length === 0) return null;

  const compareHref = `/compare?ids=${ids.join(",")}`;
  const ready = ids.length >= 2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-lg" data-testid="compare-bar">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            Comparing {ids.length} {ids.length === 1 ? "race" : "races"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {ids.map(id => (
            <Badge key={id} variant="secondary" className="gap-1" data-testid={`compare-chip-${id}`}>
              #{id}
              <button onClick={() => remove(id)} className="ml-1 hover:text-foreground" aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clear} data-testid="button-compare-clear">Clear</Button>
          <Button asChild size="sm" disabled={!ready} data-testid="button-compare-go">
            <Link href={compareHref}>{ready ? "Compare now" : "Add 1 more"}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
