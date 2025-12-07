import { Book, Gamepad2, Trophy, BookOpen, Sparkles, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  activeColor: string;
}

const navItems: NavItem[] = [
  { icon: <Book className="w-6 h-6" />, label: "Kelime", path: "/words", activeColor: "bg-orange-500" },
  { icon: <Gamepad2 className="w-6 h-6" />, label: "Oyun", path: "/game", activeColor: "bg-yellow-500" },
  { icon: <Trophy className="w-6 h-6" />, label: "Sıralama", path: "/leaderboard", activeColor: "bg-green-500" },
  { icon: <BookOpen className="w-6 h-6" />, label: "Sözlük", path: "/dictionary", activeColor: "bg-pink-500" },
  { icon: <Sparkles className="w-6 h-6" />, label: "Eğlence", path: "/fun", activeColor: "bg-purple-500" },
  { icon: <User className="w-6 h-6" />, label: "Profil", path: "/profile", activeColor: "bg-blue-500" },
];

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/words") return location.pathname === "/words" || location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200",
                active 
                  ? `${item.activeColor} text-white shadow-lg scale-105` 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.icon}
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
