import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, UserCog, GraduationCapIcon, Users2, User, Loader2, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, userData } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser && userData) {
      const from = (location.state as any)?.from?.pathname || `/dashboard/${userData.role.toLowerCase()}`;
      navigate(from, { replace: true });
    }
  }, [currentUser, userData, navigate, location]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      setError("");
      await login(email, password);
      
      // Navigation will happen automatically via useEffect when userData is loaded
    } catch (error: any) {
      // Error is already handled in AuthContext with toast notification
      // Also display error in the form for better UX
      setError(error.message || "Failed to sign in. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary-foreground mb-4">
            <GraduationCap className="h-10 w-10" />
            <span className="text-2xl font-bold">Excellence Academy</span>
          </Link>
          <p className="text-primary-foreground/90">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Choose your role and enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="admin">
                  <UserCog className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="teacher">
                  <GraduationCapIcon className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="student">
                  <User className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="parent">
                  <Users2 className="h-4 w-4" />
                </TabsTrigger>
                <TabsTrigger value="accountant">
                  <Wallet className="h-4 w-4" />
                </TabsTrigger>
              </TabsList>

              {["admin", "teacher", "student", "parent", "accountant"].map((role) => (
                <TabsContent key={role} value={role} className="space-y-4">
                  <div className="text-center py-2">
                    <h3 className="font-semibold capitalize">{role} Login</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`${role}-email`}>Email</Label>
                      <Input
                        id={`${role}-email`}
                        type="email"
                        placeholder={`${role}@example.com`}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${role}-password`}>Password</Label>
                      <Input
                        id={`${role}-password`}
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {error && (
                      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        {error}
                      </div>
                    )}
                    <Button 
                      variant="hero" 
                      className="w-full" 
                      onClick={handleLogin}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 ms-2 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
                      )}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
              <Link to="/" className="text-primary hover:underline block">
                Back to Home
              </Link>
              <p>Need access? Contact your administrator for an account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
