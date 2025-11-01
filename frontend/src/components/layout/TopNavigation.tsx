import { Search, Settings, Bell, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TopNavigation = () => {
  return (
    <header className="h-16 bg-dashboard-topnav-bg border-b border-dashboard-topnav-border flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center space-x-4">
        <img
          src="/Techwell.png"
          alt="Techwell Logo"
          className="h-8 w-auto object-contain"
        />
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search Here"
            className="pl-10 bg-background border-border"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
          </span>
        </Button>

        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src="" alt="User" />
            <AvatarFallback className="bg-dashboard-stats-blue text-white text-sm">
              Ut
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block">
            <p className="text-sm font-medium">Utham</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;
