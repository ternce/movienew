"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { PageTransition } from "@/components/layout/page-transition";
import { MobileSearchOverlay } from "@/components/search/mobile-search-overlay";
import { PendingDocumentsModal } from "@/components/documents/pending-documents-modal";
import { MiniChatWidget } from "@/components/chat/mini-chat-widget";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";

/**
 * Main layout with sidebar navigation - matches Figma design
 */
export default function MainLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);
  const setSearchOpen = useUIStore((state) => state.setSearchOpen);
  const pathname = usePathname();
  const isShortsRoute = pathname.startsWith("/shorts");
  const isWatchPartyRoute = pathname.startsWith("/watch-party");

  useEffect(() => {
    setSearchOpen(false);
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen, setSearchOpen]);

  if (isWatchPartyRoute) {
    return <>{children}</>;
  }

  return (
    <div className="mp-home-shell min-h-screen overflow-x-hidden bg-[#080013] text-white">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main content area */}
      <div
        className={cn(
          "min-h-screen transition-[margin-left] duration-300 ml-0",
          isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]",
        )}
      >
        {/* Header */}
        <AppHeader />

        {/* Page content */}
        <main
          id="main-content"
          className={cn(
            "relative z-10 px-4 pb-20 pt-0 md:px-[24px] md:pb-8",
            isShortsRoute &&
              "sesh-shorts-main max-md:px-0 max-md:pb-0 max-md:overflow-hidden",
          )}
        >
          <PageTransition variant="fade">{children}</PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* Mobile search overlay */}
      <MobileSearchOverlay />

      {/* Blocking modal for pending legal documents */}
      <PendingDocumentsModal />

      {/* Lightweight private Mini Chat */}
      <MiniChatWidget />
    </div>
  );
}
