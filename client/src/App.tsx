import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import RacesHub from "@/pages/races/index";
import RaceDetail from "@/pages/races/detail";
import RoutesHub from "@/pages/routes/index";
import ToolsHub from "@/pages/tools/index";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/races" component={RacesHub} />
      <Route path="/races/state/:state" component={RacesHub} /> {/* Reusing Hub for state view for MVP */}
      <Route path="/races/:slug" component={RaceDetail} />
      
      <Route path="/routes" component={RoutesHub} />
      <Route path="/routes/:slug" component={NotFound} /> {/* Placeholder */}
      
      <Route path="/tools" component={ToolsHub} />
      <Route path="/tools/:slug" component={ToolsHub} /> {/* Redirect all tools to hub/detail for MVP */}
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
