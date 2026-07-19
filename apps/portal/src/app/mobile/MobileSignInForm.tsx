"use client";

import { LoginForm } from "@/app/login/LoginForm";

export function MobileSignInForm() {
  return <LoginForm callbackUrl="/mobile" registerHref="/mobile?tab=profile&auth=register" variant="mobile" />;
}
