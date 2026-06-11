"use client";

import * as React from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
  }[];
};

function NavMainItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = pathname === item.url;
  const hasSubItems = !!item.items?.length;
  // Auto-expand when the current route is this item or one of its sub-pages.
  const isSubActive =
    item.items?.some((subItem) => pathname === subItem.url) ?? false;
  const [open, setOpen] = React.useState(item.isActive || isSubActive);

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <SidebarMenuItem className="relative">
        <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
          <Link href={item.url} className="relative flex items-center gap-2">
            {isActive && (
              <motion.div
                layoutId="sidebar-active-indicator"
                className="bg-primary/10 absolute inset-0 -z-10 rounded-md"
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}
            <motion.span
              className="inline-flex"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <item.icon />
            </motion.span>
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
        {hasSubItems ? (
          <>
            <CollapsibleTrigger asChild>
              <SidebarMenuAction>
                <motion.div
                  animate={{ rotate: open ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <ChevronRight />
                </motion.div>
                <span className="sr-only">Toggle</span>
              </SidebarMenuAction>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {item.items?.map((subItem) => (
                  <SidebarMenuSubItem key={subItem.title}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={pathname === subItem.url}
                    >
                      <Link href={subItem.url}>
                        <span>{subItem.title}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </>
        ) : null}
      </SidebarMenuItem>
    </Collapsible>
  );
}

export const NavMain = React.memo(function NavMain({
  items,
}: {
  items: NavItem[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <NavMainItem key={item.title} item={item} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
});
