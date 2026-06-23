"use client";

import Link from "next/link";
import { useState } from "react";
import type { Role, UserStatus } from "@prisma/client";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import type { AssignableUserFeature } from "@/lib/users-service";
import { PermissionPanel } from "./PermissionPanel";

const ROLE = {
  ADMIN: "ADMIN",
  ACADEMY_ADMIN: "ACADEMY_ADMIN",
  PLATFORM_ADMIN: "PLATFORM_ADMIN",
  STANDARD_USER: "STANDARD_USER",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

const USER_STATUS = {
  ACTIVE: "ACTIVE",
  DISABLED: "DISABLED",
} as const;

type UserFormAcademy = {
  id: string;
  name: string;
};

type UserFormUser = {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;
  role: Role;
  status: UserStatus;
  academyId: string | null;
};

export function UserForm({
  academyAdmin = false,
  academies,
  action,
  assignableFeatures = [],
  cancelHref = "/admin/users",
  mode,
  returnTo,
  superAdmin,
  user,
}: {
  academyAdmin?: boolean;
  academies: UserFormAcademy[];
  action: (formData: FormData) => Promise<void>;
  assignableFeatures?: AssignableUserFeature[];
  cancelHref?: string;
  mode: "create" | "edit";
  returnTo?: string;
  superAdmin: boolean;
  user?: UserFormUser;
}) {
  const academyOptions: AutoCompleteTextFieldOption[] = academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
  }));
  const lockedAcademy = academyAdmin ? academies[0] : null;
  const [activeTab, setActiveTab] = useState<"details" | "permissions">("details");

  const detailsForm = (
    <form action={action} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      <div className="mb-6">
        <h2 className="text-xl font-black text-stone-950">User Information</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-stone-950">
          Full Name
          <input name="name" defaultValue={user?.name ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
        </label>

        <label className="grid gap-2 text-sm font-black text-stone-950">
          Email Address
          <input name="email" type="email" required defaultValue={user?.email ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
        </label>

        {mode === "edit" ? (
          <label className="grid gap-2 text-sm font-black text-stone-950">
            Phone <span className="font-medium text-stone-500">(optional)</span>
            <input name="phone" type="tel" defaultValue={user?.phone ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
          </label>
        ) : null}

        {mode === "create" ? (
          <label className="grid gap-2 text-sm font-black text-stone-950">
            Temporary Password
            <input name="password" type="password" placeholder="rollfinder-user" className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
          </label>
        ) : null}

        <label className="grid gap-2 text-sm font-black text-stone-950">
          Role
          <select name="role" defaultValue={user?.role ?? ROLE.STANDARD_USER} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
            <option value={ROLE.STANDARD_USER}>Standard user</option>
            <option value={ROLE.ACADEMY_ADMIN}>Academy admin</option>
            {!academyAdmin && superAdmin ? <option value={ROLE.PLATFORM_ADMIN}>Platform admin</option> : null}
            {!academyAdmin && superAdmin ? <option value={ROLE.SUPER_ADMIN}>Super admin</option> : null}
            {!academyAdmin && superAdmin && user?.role === ROLE.ADMIN ? <option value={ROLE.ADMIN}>Admin</option> : null}
          </select>
          <span className="text-sm font-medium text-stone-600">Defines the user's primary role in the system.</span>
        </label>

        {lockedAcademy ? (
          <div className="grid gap-2 text-sm font-black text-stone-950">
            Academy
            <input type="hidden" name="academyId" value={lockedAcademy.id} />
            <p className="min-h-14 rounded-md border border-stone-200 bg-stone-50 px-4 py-4 text-base font-semibold text-stone-800">{lockedAcademy.name}</p>
          </div>
        ) : (
          <AutoCompleteTextField
            label="Academy"
            name="academyId"
            options={academyOptions}
            selectedId={user?.academyId ?? ""}
            placeholder="Search academy by name"
            emptyMessage="No academies found."
            size="lg"
          />
        )}

        {mode === "edit" ? (
          <label className="grid gap-2 text-sm font-black text-stone-950">
            Status
            <select name="status" defaultValue={user?.status ?? USER_STATUS.ACTIVE} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
              <option value={USER_STATUS.ACTIVE}>Active</option>
              <option value={USER_STATUS.DISABLED}>Disabled</option>
            </select>
            <span className="text-sm font-medium text-stone-600">Inactive users cannot access the system.</span>
          </label>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="min-h-12 rounded-md bg-stone-950 px-5 text-sm font-bold text-white">
          {mode === "create" ? "Create User" : "Save All Changes"}
        </button>
        <Link href={cancelHref} className="inline-flex min-h-12 items-center rounded-md border border-stone-300 px-5 text-sm font-bold text-stone-800">Cancel</Link>
      </div>
    </form>
  );

  if (mode === "create" || !user) {
    return <div className="mt-8">{detailsForm}</div>;
  }

  return (
    <div className="mt-8">
      <div className="mb-5 inline-flex rounded-lg border border-stone-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Edit user sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          onClick={() => setActiveTab("details")}
          className={`min-h-11 rounded-md px-5 text-sm font-black ${activeTab === "details" ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-50"}`}
        >
          User Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "permissions"}
          onClick={() => setActiveTab("permissions")}
          className={`min-h-11 rounded-md px-5 text-sm font-black ${activeTab === "permissions" ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-50"}`}
        >
          Permissions
        </button>
      </div>

      {activeTab === "details" ? detailsForm : <PermissionPanel features={assignableFeatures} userId={user.id} />}
    </div>
  );
}
