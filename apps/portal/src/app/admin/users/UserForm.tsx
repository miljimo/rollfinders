import Link from "next/link";
import { Role, UserStatus } from "@prisma/client";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { canSeeRole, roleLevel } from "@/lib/role-hierarchy";
import type { AssignableUserFeature } from "@/lib/users-service";
import { PermissionPanel } from "./PermissionPanel";
import { UserFormTabs } from "./UserFormTabs";

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
  actorRole,
  assignableFeatures = [],
  cancelHref = "/admin/users",
  mode,
  initialTab = "details",
  returnTo,
  superAdmin,
  user,
}: {
  academyAdmin?: boolean;
  academies: UserFormAcademy[];
  action: (formData: FormData) => Promise<void>;
  actorRole?: string;
  assignableFeatures?: AssignableUserFeature[];
  cancelHref?: string;
  mode: "create" | "edit";
  initialTab?: "details" | "permissions";
  returnTo?: string;
  superAdmin: boolean;
  user?: UserFormUser;
}) {
  const academyOptions: AutoCompleteTextFieldOption[] = academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
  }));
  const lockedAcademy = academyAdmin ? academies[0] : null;
  const effectiveActorRole = actorRole ?? (superAdmin ? Role.SUPER_ADMIN : academyAdmin ? Role.ACADEMY_ADMIN : Role.PLATFORM_ADMIN);
  const actorLevel = roleLevel(effectiveActorRole);
  const roleOptions = [
    { value: Role.STANDARD_USER, label: "Standard user", minimumActorLevel: roleLevel(Role.STANDARD_USER) },
    { value: Role.ACADEMY_ADMIN, label: "Academy admin", minimumActorLevel: roleLevel(Role.ACADEMY_ADMIN) },
    { value: Role.ACADEMY_OWNER, label: "Academy owner", minimumActorLevel: roleLevel(Role.PLATFORM_ADMIN) },
    { value: Role.PLATFORM_ADMIN, label: "Platform admin", minimumActorLevel: roleLevel(Role.SUPER_ADMIN) },
    { value: Role.SUPER_ADMIN, label: "Super admin", minimumActorLevel: roleLevel(Role.SUPER_ADMIN) },
    ...(user?.role === Role.ADMIN ? [{ value: Role.ADMIN, label: "Admin", minimumActorLevel: roleLevel(Role.ADMIN) }] : []),
  ].filter((option) => actorLevel >= option.minimumActorLevel && canSeeRole(effectiveActorRole, option.value));

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
          <select name="role" defaultValue={user?.role ?? Role.STANDARD_USER} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
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
            <select name="status" defaultValue={user?.status ?? UserStatus.ACTIVE} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
              <option value={UserStatus.ACTIVE}>Active</option>
              <option value={UserStatus.DISABLED}>Disabled</option>
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
    <UserFormTabs
      detailsPanel={detailsForm}
      initialTab={initialTab}
      permissionsPanel={<PermissionPanel features={assignableFeatures} userId={user.id} />}
    />
  );
}
