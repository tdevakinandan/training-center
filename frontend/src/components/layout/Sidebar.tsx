import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Settings, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hasSubmenu?: boolean;
  submenu?: { title: string; href: string }[];
}

const menuItems: MenuItem[] = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    hasSubmenu: true,
    submenu: [{ title: "Dashboard", href: "/" }],
  },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Employee", href: "/employee", icon: Users },
  { title: "Settings", href: "/settings", icon: Settings },
];

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleSubmenu = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={onToggle}
      />
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-dashboard-sidebar-bg z-30 w-64 transform transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-4 space-y-2 mt-16 md:mt-0">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href;
            const isExpanded = expandedItems.includes(item.title);
            const hasActiveSubmenu = item.submenu?.some(
              (sub) => location.pathname === sub.href
            );

            return (
              <div key={item.title}>
                <div className="relative">
                  {item.hasSubmenu ? (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-dashboard-sidebar-text hover:bg-dashboard-sidebar-hover hover:text-white transition-smooth",
                        (isActive || hasActiveSubmenu) &&
                          "bg-dashboard-sidebar-active text-white"
                      )}
                      onClick={() => toggleSubmenu(item.title)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      <span className="flex-1 text-left">{item.title}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  ) : (
                    <Link to={item.href} onClick={onToggle}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start text-dashboard-sidebar-text hover:bg-dashboard-sidebar-hover hover:text-white transition-smooth",
                          isActive && "bg-dashboard-sidebar-active text-white"
                        )}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.title}
                      </Button>
                    </Link>
                  )}
                </div>

                {item.hasSubmenu && isExpanded && (
                  <div className="ml-4 mt-2 space-y-1">
                    {item.submenu?.map((subItem) => {
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          onClick={onToggle}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-dashboard-sidebar-secondary hover:bg-dashboard-sidebar-hover hover:text-white transition-smooth",
                              isSubActive &&
                                "bg-dashboard-sidebar-active text-white"
                            )}
                          >
                            <div className="w-2 h-2 rounded-full bg-current mr-3 opacity-50" />
                            {subItem.title}
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
