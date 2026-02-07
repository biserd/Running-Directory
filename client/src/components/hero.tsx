import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface HeroProps {
  title: string;
  subtitle?: string;
  image?: string;
  showSearch?: boolean;
  align?: "center" | "left";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}

export function Hero({ 
  title, 
  subtitle, 
  image, 
  showSearch = false, 
  align = "center",
  size = "default",
  children
}: HeroProps) {
  return (
    <div className={cn(
      "relative flex flex-col justify-center overflow-hidden bg-slate-900 text-white",
      size === "default" && "min-h-[300px] py-12",
      size === "sm" && "min-h-[200px] py-8",
      size === "lg" && "min-h-[450px] py-20"
    )}>
      {image && (
        <div className="absolute inset-0 z-0">
          <img 
            src={image} 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-40 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute inset-0 bg-slate-900/40" />
        </div>
      )}
      
      <div className={cn(
        "container relative z-10 px-4 mx-auto",
        align === "center" && "text-center",
        align === "left" && "text-left"
      )}>
        <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 max-w-4xl mx-auto">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}

        {children && (
          <div className="mb-8">
            {children}
          </div>
        )}
        
        {showSearch && (
          <div className="max-w-xl mx-auto w-full bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <input 
                  type="text" 
                  placeholder="Find races by city, state, or name..." 
                  className="w-full h-11 pl-10 pr-4 bg-transparent text-white placeholder:text-slate-400 border-none outline-none focus:ring-0"
                />
              </div>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-semibold">
                Search
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
