import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Pages scroll inside .app-scroll on wide screens, not the window, so reset that too on every new page.
    scrollToTopSelectors: [".app-scroll"],
    // Load a page's code when the pointer rests on its link, so the old page doesn't linger and then pop.
    defaultPreload: "intent",
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
    // No view transition on navigation: it snapshots the whole window, so the glass sidebar and header flashed like a reload.
  });

  return router;
};
