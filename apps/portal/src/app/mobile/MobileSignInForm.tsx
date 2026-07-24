"use client";

import { LoginForm } from "@/app/login/LoginForm";

export function MobileSignInForm() {
  return <LoginForm callbackUrl="/mobile" forgotPasswordHref="/mobile?tab=profile&auth=forgot-password" registerHref="/mobile?tab=profile&auth=register" variant="mobile" />;
}
