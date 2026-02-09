import { Switch, Route } from "wouter";
import { QueryClientProvider, QueryClient, HydrationBoundary, DehydratedState } from "@tanstack/react-query";
import { queryClient as defaultQueryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { LoginModal } from "@/components/login-modal";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import RacesHub from "@/pages/races/index";
import RacesUSAPage from "@/pages/races/usa";
import RacesCityPage from "@/pages/races/city";
import RacesYearPage from "@/pages/races/year";
import RacesNearbyPage from "@/pages/races/nearby";
import RaceDetail from "@/pages/races/detail";
import RoutesHub from "@/pages/routes/index";
import RoutesStatePage from "@/pages/routes/state";
import RoutesCityPage from "@/pages/routes/city";
import RouteDetail from "@/pages/routes/detail";
import ToolsHub from "@/pages/tools/index";
import ToolDetail from "@/pages/tools/detail";
import GuidesHub from "@/pages/guides/index";
import CollectionsHub from "@/pages/collections/index";
import CollectionDetail from "@/pages/collections/detail";
import InfluencersHub from "@/pages/influencers/index";
import InfluencerDetail from "@/pages/influencers/detail";
import PodcastsHub from "@/pages/podcasts/index";
import PodcastDetail from "@/pages/podcasts/detail";
import BooksHub from "@/pages/books/index";
import BookDetail from "@/pages/books/detail";
import StateHub from "@/pages/state/index";
import CityHub from "@/pages/state/city";
import TermsOfService from "@/pages/terms";
import PrivacyPolicy from "@/pages/privacy";
import AboutPage from "@/pages/about";
import ContactPage from "@/pages/contact";
import BlogPage from "@/pages/blog";
import AuthVerifyPage from "@/pages/auth/verify";
import FavoritesPage from "@/pages/favorites";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/verify" component={AuthVerifyPage} />
      <Route path="/favorites" component={FavoritesPage} />
      <Route path="/races" component={RacesHub} />
      <Route path="/races/usa" component={RacesUSAPage} />
      <Route path="/races/state/:state/city/:city" component={RacesCityPage} />
      <Route path="/races/state/:state" component={RacesHub} />
      <Route path="/races/year/:year/month/:month" component={RacesYearPage} />
      <Route path="/races/year/:year" component={RacesYearPage} />
      <Route path="/races/nearby" component={RacesNearbyPage} />
      <Route path="/races/:slug" component={RaceDetail} />
      <Route path="/routes" component={RoutesHub} />
      <Route path="/routes/state/:state/city/:city" component={RoutesCityPage} />
      <Route path="/routes/state/:state" component={RoutesStatePage} />
      <Route path="/routes/:slug" component={RouteDetail} />
      <Route path="/tools" component={ToolsHub} />
      <Route path="/tools/:slug" component={ToolDetail} />
      <Route path="/guides" component={GuidesHub} />
      <Route path="/collections" component={CollectionsHub} />
      <Route path="/collections/:slug" component={CollectionDetail} />
      <Route path="/influencers" component={InfluencersHub} />
      <Route path="/influencers/:slug" component={InfluencerDetail} />
      <Route path="/podcasts" component={PodcastsHub} />
      <Route path="/podcasts/:slug" component={PodcastDetail} />
      <Route path="/books" component={BooksHub} />
      <Route path="/books/:slug" component={BookDetail} />
      <Route path="/state/:state/city/:city" component={CityHub} />
      <Route path="/state/:state" component={StateHub} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/about" component={AboutPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/blog" component={BlogPage} />
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <LoginModal />
            <AppRouter />
          </TooltipProvider>
        </AuthProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
