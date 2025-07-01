"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react"

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState("login")

  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupFullName, setSignupFullName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const { signIn, signUp } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      await signIn(loginEmail, loginPassword)
      // Success will be handled by the auth state change
    } catch (err) {
      console.error("Sign in error:", err)

      let errorMessage = "Failed to sign in"

      if (err.message) {
        if (err.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password"
        } else if (err.message.includes("Email not confirmed")) {
          errorMessage = "Please check your email and confirm your account"
        } else if (err.message.includes("Too many requests")) {
          errorMessage = "Too many login attempts. Please try again later"
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    // Validation
    if (signupPassword !== confirmPassword) {
      setError("Passwords don't match")
      setLoading(false)
      return
    }

    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    if (!signupFullName.trim()) {
      setError("Full name is required")
      setLoading(false)
      return
    }

    try {
      await signUp(signupEmail, signupPassword, signupFullName)
      setMessage("Please check your email to confirm your account before signing in")

      // Clear form
      setSignupEmail("")
      setSignupPassword("")
      setSignupFullName("")
      setConfirmPassword("")

      // Switch to login tab after a short delay
      setTimeout(() => {
        setActiveTab("login")
      }, 2000)
    } catch (err: any) {
      console.error("Sign up error:", err)

      let errorMessage = "Failed to create account"

      if (err.message) {
        if (err.message.includes("already registered")) {
          errorMessage = "An account with this email already exists"
        } else if (err.message.includes("Password should be")) {
          errorMessage = "Password should be at least 6 characters"
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Demo account helper
  const fillDemoAccount = () => {
    setLoginEmail("demo@medicalquiz.com")
    setLoginPassword("demo123")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medical Quiz App</h1>
          <p className="text-gray-600 mt-2">Sign in to access your personalized quiz experience</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        disabled={loading}
                        placeholder="Enter your password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent"
                    onClick={fillDemoAccount}
                    disabled={loading}
                  >
                    Try Demo Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Sign up for a new account to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={loading}
                        placeholder="At least 6 characters"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Confirm your password"
                    />
                  </div>

                  {error && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {message && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{message}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
