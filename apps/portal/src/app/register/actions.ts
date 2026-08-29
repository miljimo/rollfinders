"use server";

import { redirect } from "next/navigation";
import {
  addPublicRegistrationAcademyMember,
  getAcademyFromAcademyService,
} from "@/lib/academyService";
import { sendAccountVerificationEmail } from "@/lib/email-verification";
import {
  authenticateUserCredentials,
  registerUserAccount,
  UserServiceError,
} from "@/lib/users-service";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function registerHref(params: Record<string, string>) {
  const query = new URLSearchParams(params);
  return `/register?${query.toString()}`;
}

function safeCallbackUrl(value: string) {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

function failureRedirect(
  message: string,
  academyId?: string,
  academySlug?: string,
  callbackUrl = "/dashboard",
) {
  const params: Record<string, string> = { error: message };
  if (academyId) params.academyId = academyId;
  if (academySlug) params.academy = academySlug;
  if (callbackUrl !== "/dashboard") params.callbackUrl = callbackUrl;
  redirect(registerHref(params));
}

export async function registerPractitioner(formData: FormData) {
  const academyId = textValue(formData, "academyId");
  const academySlug = textValue(formData, "academySlug");
  const firstName = textValue(formData, "firstName");
  const lastName = textValue(formData, "lastName");
  const email = textValue(formData, "email").toLowerCase();
  const password = textValue(formData, "password");
  const confirmPassword = textValue(formData, "confirmPassword");
  const callbackUrl = safeCallbackUrl(textValue(formData, "callbackUrl"));

  if (!academyId)
    failureRedirect(
      "Choose your academy before creating an account.",
      academyId,
      academySlug,
      callbackUrl,
    );
  if (!firstName || !lastName || !email || !password)
    failureRedirect(
      "First name, last name, email, and password are required.",
      academyId,
      academySlug,
      callbackUrl,
    );
  if (password.length < 5)
    failureRedirect(
      "Password must be at least 5 characters.",
      academyId,
      academySlug,
      callbackUrl,
    );
  if (password !== confirmPassword)
    failureRedirect(
      "Passwords do not match.",
      academyId,
      academySlug,
      callbackUrl,
    );

  const academy = await getAcademyFromAcademyService(academyId);
  if (!academy) {
    failureRedirect(
      "Choose a valid academy before creating an account.",
      academyId,
      academySlug,
      callbackUrl,
    );
    return;
  }

  let userId = "";
  try {
    const result = await registerUserAccount({
      firstName,
      lastName,
      email,
      password,
    });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof UserServiceError && error.status === 409) {
      try {
        const result = await authenticateUserCredentials(email, password);
        userId = result.user_id;
      } catch {
        failureRedirect(
          "An account with that email already exists. Sign in instead, or ask the academy to add you.",
          academyId,
          academySlug,
          callbackUrl,
        );
      }
    } else {
      failureRedirect(
        "We could not create your account. Check your details and try again.",
        academyId,
        academySlug,
        callbackUrl,
      );
    }
  }

  try {
    await addPublicRegistrationAcademyMember(academy.id, userId);
  } catch {
    failureRedirect(
      "We could not link your academy. Try again, or contact support before creating another account.",
      academyId,
      academySlug,
      callbackUrl,
    );
  }

  try {
    await sendAccountVerificationEmail(email);
  } catch {
    const loginParams = new URLSearchParams({
      registered: "1",
      email,
      callbackUrl,
      verifyEmail: "1",
      warning: "verification-email",
    });
    redirect(`/login?${loginParams.toString()}`);
  }

  const loginParams = new URLSearchParams({
    registered: "1",
    email,
    callbackUrl,
    verifyEmail: "1",
  });
  redirect(`/login?${loginParams.toString()}`);
}
