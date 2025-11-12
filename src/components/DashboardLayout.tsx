import { ReactNode, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, GraduationCap, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  role: string;
  menuItems: Array<{
    label: string;
    path: string;
    icon: ReactNode;
  }>;
}

const DashboardLayout = ({ children, role, menuItems }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, userData } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    } finally {
      setShowLogoutDialog(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-l border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 flex-row-reverse">
            <GraduationCap className="h-8 w-8" />
            <div className="text-right">
              <div className="font-bold text-lg">Excellence Academy</div>
              <div className="text-xs text-sidebar-foreground/70 capitalize">{role} Portal</div>
            </div>
          </Link>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-end flex-row-reverse",
                  location.pathname === item.path 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <span className="me-2">{item.label}</span>
                {item.icon}
              </Button>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <h1 className="text-xl font-semibold capitalize">{role} لوحة التحكم </h1>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 flex-row-reverse">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userData?.displayName?.charAt(0).toUpperCase() || userData?.email?.charAt(0).toUpperCase() || role.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium">{userData?.displayName || userData?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userData?.role || role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{userData?.displayName || "User"}</p>
                    <p className="text-xs text-muted-foreground">{userData?.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userData?.role || role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogoutDialog(true)} className="text-destructive focus:text-destructive flex-row-reverse">
                  <LogOut className="h-4 w-4 me-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Logout Confirmation Dialog */}
          <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will be signed out of your account and redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loggingOut}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {loggingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                      Logging out...
                    </>
                  ) : (
                    "Logout"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
