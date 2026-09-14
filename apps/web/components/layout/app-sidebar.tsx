"use client";

import {
  Bag,
  BookOpen,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Coins,
  DeviceMobile,
  FileText,
  FilmStrip,
  Gear,
  GitBranch,
  Heart,
  House,
  Package,
  Plus,
  ShareNetwork,
  ShieldCheck,
  SignOut,
  Television,
  User,
  Users,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { SeshLogo } from "@/components/common/sesh-logo";
import { CollapsedNavTooltip } from "@/components/layout/collapsed-nav-tooltip";
import { PwaInstallAction } from "@/components/pwa/pwa-install-action";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";
import { canUsePartnerDashboard, canUseStudio } from "@/lib/role-permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth.store";
import { useUIStore } from "@/stores/ui.store";

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const baseNavGroups: NavGroup[] = [
  {
    label: "МЕНЮ",
    items: [
      { href: "/dashboard", icon: House, label: "Главная" },
      { href: "/series", icon: Television, label: "Сериалы" },
      { href: "/videos", icon: FilmStrip, label: "Видео" },
      { href: "/shorts", icon: DeviceMobile, label: "Шортсы" },
      { href: "/tutorials", icon: BookOpen, label: "Обучение" },
    ],
  },
  {
    label: "БИБЛИОТЕКА",
    items: [
      {
        href: "/account/history",
        icon: ClockCounterClockwise,
        label: "История",
      },
      { href: "/account/watchlist", icon: Heart, label: "Избранное" },
    ],
  },
  {
    label: "МАГАЗИН",
    items: [
      { href: "/store", icon: Bag, label: "Каталог" },
      { href: "/store/orders", icon: Package, label: "Мои заказы" },
    ],
  },
  {
    label: "АККАУНТ",
    items: [
      { href: "/account", icon: User, label: "Мой аккаунт" },
      {
        href: "/account/verification",
        icon: ShieldCheck,
        label: "Верификация",
      },
      { href: "/documents", icon: FileText, label: "Документы" },
    ],
  },
];

const studioNavGroup: NavGroup = {
  label: "СТУДИЯ",
  items: [
    { href: "/studio/create", icon: Plus, label: "Создать контент" },
    { href: "/studio", icon: VideoCamera, label: "Мой контент" },
  ],
};

const partnerNavGroup: NavGroup = {
  label: "ПАРТНЁРАМ",
  items: [
    { href: "/partner", icon: Users, label: "Дашборд" },
    { href: "/partner/referrals", icon: GitBranch, label: "Рефералы" },
    { href: "/partner/commissions", icon: Coins, label: "Комиссии" },
    { href: "/partner/invite", icon: ShareNetwork, label: "Пригласить" },
  ],
};
const SIDEBAR_WIDTH = 340;
const SIDEBAR_COLLAPSED_WIDTH = 72;

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { logout } = useAuth();
  const { user } = useAuthStore();
  const {
    isMobileMenuOpen,
    isSidebarCollapsed,
    setMobileMenuOpen,
    toggleSidebarCollapsed,
  } = useUIStore();

  const canAccessStudio = canUseStudio(user?.role, user?.verificationStatus);
  const canModerate = user?.role === "ADMIN" || user?.role === "MODERATOR";
  const canAccessPartnerDashboard = canUsePartnerDashboard(
    user?.role,
    user?.verificationStatus,
  );

  const navGroups = React.useMemo(() => {
    const groups = [...baseNavGroups];
    if (canAccessStudio) {
      groups.push({
        ...studioNavGroup,
        items: canModerate
          ? [
              studioNavGroup.items[0],
              {
                href: "/admin/content",
                icon: ShieldCheck,
                label: "Модерация контента",
              },
              ...studioNavGroup.items.slice(1),
            ]
          : studioNavGroup.items,
      });
    }
    if (canAccessPartnerDashboard) groups.push(partnerNavGroup);
    return groups;
  }, [canAccessPartnerDashboard, canAccessStudio, canModerate]);

  const isActive = (href: string) => pathname === href;

  const handleNavClick = () => setMobileMenuOpen(false);
  const collapsedClass = isSidebarCollapsed ? "md:w-[72px]" : "md:w-[260px]";

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="sesh-mobile-sidebar-backdrop fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          "sesh-mobile-sidebar fixed left-0 top-0 z-50 flex h-dvh flex-col overflow-hidden border-r border-white/[0.035] bg-[#120008]/76 shadow-[24px_0_70px_rgba(0,0,0,0.36)] backdrop-blur-2xl transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
          collapsedClass,
          className,
        )}
        style={{
          width: isMobileMenuOpen ? SIDEBAR_WIDTH : undefined,
          backgroundImage:
            "linear-gradient(180deg, rgba(12,0,9,0.82), rgba(47,0,18,0.74)), url('/images/background.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "left bottom",
        }}
      >
        <div
          className={cn(
            "relative flex h-[84px] shrink-0 items-start justify-between pt-[17px]",
            isSidebarCollapsed ? "px-3" : "px-[24px]",
          )}
        >
          <CollapsedNavTooltip label="СЕШ Видео" collapsed={isSidebarCollapsed}>
            <SeshLogo
              href="/videos"
              className="min-w-0 md:absolute md:left-1/2 md:-translate-x-1/2"
              imageClassName={cn(
                "h-10 w-auto",
                isSidebarCollapsed ? "md:h-8" : "md:h-12",
              )}
              priority
              mobile={isMobile || isSidebarCollapsed}
              onClick={handleNavClick}
            />
          </CollapsedNavTooltip>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-md p-1.5 text-white/55 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={cn(
            "shrink-0 pb-[26px]",
            isSidebarCollapsed ? "px-2.5" : "px-[20px]",
          )}
        >
          <CollapsedNavTooltip label="Загрузить" collapsed={isSidebarCollapsed}>
            <Link
              href="/studio/create"
              onClick={handleNavClick}
              className={cn(
                "group relative isolate mx-auto flex h-[34px] w-[148px] items-center justify-center overflow-hidden rounded-full border-0 bg-[linear-gradient(90deg,#cf1d31_0%,#ba2467_45%,#6f35a2_70%,#1b78b5_100%)] text-[14px] font-normal leading-none tracking-normal text-white/90 shadow-[0_0_13px_rgba(255,35,62,0.42),0_8px_24px_rgba(176,46,183,0.2),0_0_12px_rgba(35,135,213,0.28),inset_0_1px_1px_rgba(255,255,255,0.16),inset_0_-1px_2px_rgba(0,0,0,0.22)] transition-all duration-300 hover:brightness-105 hover:shadow-[0_0_16px_rgba(255,35,62,0.5),0_8px_26px_rgba(176,46,183,0.24),0_0_14px_rgba(35,135,213,0.32),inset_0_1px_1px_rgba(255,255,255,0.18)]",
                isSidebarCollapsed && "md:w-[36px] md:px-0",
              )}
              aria-label="Загрузить"
            >
              <span
                className={cn(
                  "relative truncate",
                  isSidebarCollapsed && "md:hidden",
                )}
              >
                Загрузить
              </span>
            </Link>
          </CollapsedNavTooltip>
        </div>

        <nav
          className={cn(
            "sidebar-neon-scrollbar touch-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-0",
            isSidebarCollapsed ? "space-y-3 px-2.5" : "space-y-[12px] px-0",
          )}
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                className={cn(
                  "mb-1.5 px-[16px]",
                  isSidebarCollapsed && "md:hidden",
                )}
              >
                <span className="text-[10px] font-medium uppercase tracking-normal text-white/42">
                  {group.label}
                </span>
              </div>

              <div
                className={cn(
                  "space-y-0.5",
                  !isSidebarCollapsed &&
                    "relative mx-0 pb-[12px] after:absolute after:bottom-0 after:left-[54px] after:right-[36px] after:h-px after:bg-white/18 after:content-['']",
                )}
              >
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <CollapsedNavTooltip
                      key={item.href}
                      label={item.label}
                      collapsed={isSidebarCollapsed}
                    >
                      <Link
                        href={item.href}
                        onClick={handleNavClick}
                        className={cn(
                          "relative flex items-center text-[13px] font-normal transition-all duration-200",
                          isSidebarCollapsed
                            ? "mx-auto h-11 w-11 gap-0 rounded-xl p-0 md:justify-center"
                            : "h-[27px] gap-3 rounded-none px-[32px] py-0",
                          active
                            ? "bg-[#4c000b]/34 text-white/88 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-[#ff2632] before:content-['']"
                            : "text-white/68 hover:bg-white/[0.035] hover:text-white/86",
                        )}
                      >
                        <item.icon className="h-[14px] w-[14px] shrink-0 text-white/48" />
                        <span
                          className={cn(
                            "truncate transition-opacity duration-200",
                            isSidebarCollapsed && "md:hidden",
                          )}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </CollapsedNavTooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "shrink-0 space-y-0.5",
            isSidebarCollapsed ? "px-2 py-2" : "px-0 pb-2 pt-1",
          )}
        >
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            aria-label={
              isSidebarCollapsed ? "Развернуть меню" : "Свернуть меню"
            }
            className={cn(
              "hidden w-full items-center text-[13px] font-normal text-white/78 transition-colors hover:bg-white/[0.045] hover:text-white md:flex",
              isSidebarCollapsed
                ? "h-[27px] justify-center rounded-lg px-0"
                : "h-[27px] gap-3 px-[32px]",
            )}
          >
            {isSidebarCollapsed ? (
              <CaretRight className="h-[14px] w-[14px] shrink-0" />
            ) : (
              <CaretLeft className="h-[14px] w-[14px] shrink-0" />
            )}
            <span className={cn(isSidebarCollapsed && "md:hidden")}>
              Свернуть
            </span>
          </button>

          <CollapsedNavTooltip label="Настройки" collapsed={isSidebarCollapsed}>
            <Link
              href="/account/settings"
              onClick={handleNavClick}
              className={cn(
                "relative flex items-center text-[13px] font-normal transition-all",
                isSidebarCollapsed
                  ? "mx-auto h-11 w-11 gap-0 rounded-xl p-0 md:justify-center"
                  : "h-[27px] gap-3 px-[32px]",
                isActive("/account/settings")
                  ? "bg-[#4c000b]/34 text-white/88 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-[#ff2632] before:content-['']"
                  : "text-white/68 hover:bg-white/[0.045] hover:text-white/86",
              )}
            >
              <Gear className="h-[14px] w-[14px] shrink-0 text-white/48" />
              <span
                className={cn("truncate", isSidebarCollapsed && "md:hidden")}
              >
                Настройки
              </span>
            </Link>
          </CollapsedNavTooltip>

          <div className="md:hidden">
            <PwaInstallAction
              mobileMenuItem
              onNativePromptComplete={handleNavClick}
            />
          </div>

          <CollapsedNavTooltip label="Выйти" collapsed={isSidebarCollapsed}>
            <button
              onClick={logout}
              className={cn(
                "flex w-full items-center text-[13px] font-normal text-[#ff2632] transition-colors hover:bg-[#ff2632]/10",
                isSidebarCollapsed
                  ? "mx-auto h-11 w-11 gap-0 rounded-xl p-0 md:justify-center"
                  : "h-[27px] gap-3 px-[32px]",
              )}
            >
              <SignOut className="h-[14px] w-[14px] shrink-0" />
              <span
                className={cn("truncate", isSidebarCollapsed && "md:hidden")}
              >
                Выйти
              </span>
            </button>
          </CollapsedNavTooltip>
        </div>
      </aside>
    </>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };
