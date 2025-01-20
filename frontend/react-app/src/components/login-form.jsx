import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription } from "./ui/alert";

export function LoginForm({ className, ...props }) {
  const { login, loading, error, isActivated, activateLicense } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
    licenseKey: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isActivated) {
      // Handle license activation
      const success = await activateLicense(credentials.licenseKey);
      if (success) {
        // Clear license key and proceed to login
        setCredentials(prev => ({
          ...prev,
          licenseKey: ""
        }));
      }
      return;
    }

    // Handle regular login
    const success = await login({
      email: credentials.email,
      password: credentials.password
    });

    if (success) {
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isActivated ? "Login" : "Activate License"}
          </CardTitle>
          <CardDescription>
            {isActivated
              ? "Enter your email below to login to your account"
              : "Please enter your license key to activate the application"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!isActivated ? (
                <div className="grid gap-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input
                    id="licenseKey"
                    type="text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    required
                    value={credentials.licenseKey}
                    onChange={handleInputChange}
                    pattern="^[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}-[A-Za-z0-9]{4}$"
                    title="Please enter a valid license key in the format: XXXX-XXXX-XXXX-XXXX"
                  />
                </div>
              ) : (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={credentials.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <a
                        href="#"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={credentials.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? (isActivated ? "Logging in..." : "Activating...")
                  : (isActivated ? "Login" : "Activate License")}
              </Button>
            </div>

            {isActivated && (
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <a href="#" className="underline underline-offset-4">
                  Sign up
                </a>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}