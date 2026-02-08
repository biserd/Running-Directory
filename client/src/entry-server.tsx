import { renderToString } from "react-dom/server";
import { QueryClient, dehydrate } from "@tanstack/react-query";
import { Router } from "wouter";
import App from "./App";

export interface PageMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: string;
  canonicalUrl?: string;
  jsonLd?: Record<string, any>;
}

export interface SSRResult {
  html: string;
  dehydratedState: unknown;
  meta: PageMeta;
}

export async function render(
  url: string,
  prefetchFn?: (queryClient: QueryClient) => Promise<PageMeta>
): Promise<SSRResult> {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });

  let meta: PageMeta = {
    title: "running.services | USA Race Calendar & Route Directory",
    description: "The comprehensive data-driven running hub for the USA. Find races, discover routes, and access essential training tools.",
    ogType: "website",
  };

  if (prefetchFn) {
    try {
      meta = await prefetchFn(queryClient);
    } catch (e) {
      console.error("SSR prefetch error:", e);
    }
  }

  const dehydratedState = dehydrate(queryClient);

  const html = renderToString(
    <Router ssrPath={url}>
      <App queryClient={queryClient} dehydratedState={dehydratedState} />
    </Router>
  );

  queryClient.clear();

  return { html, dehydratedState, meta };
}
