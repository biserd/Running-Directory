import { Switch, Route } from "wouter";
import { QueryClientProvider, QueryClient, HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import RacesHub from "@/pages/races/index";
import RaceDetail from "@/pages/races/detail";
import RoutesHub from "@/pages/routes/index";
import ToolsHub from "@/pages/tools/index";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/races" component={RacesHub} />
      <Route path="/races/state/:state" component={RacesHub} />
      <Route path="/races/:slug" component={RaceDetail} />
      <Route path="/routes" component={RoutesHub} />
      <Route path="/routes/:slug" component={NotFound} />
      <Route path="/tools" component={ToolsHub} />
      <Route path="/tools/:slug" component={ToolsHub} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface AppProps {
  queryClient?: QueryClient;
  dehydratedState?: DehydratedState;
}

export default function App({ queryClient, dehydratedState }: AppProps = {}) {
  const client = queryClient || defaultQueryClient;

  return (
    <QueryClientProvider client={client}>
      <HydrationBoundary state={dehydratedState}>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
