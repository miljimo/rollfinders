import Link from "next/link";
import { Role, UserStatus } from "@prisma/client";

type UserFormAcademy = {
  id: string;
  name: string;
};

type UserFormUser = {
  name: string | null;
  email: string;
  role: Role;
  status: UserStatus;
  academyId: string | null;
};

export function UserForm({
  academies,
  action,
  mode,
  superAdmin,
  user,
}: {
  academies: UserFormAcademy[];
  action: (formData: FormData) => Promise<void>;
  mode: "create" | "edit";
  superAdmin: boolean;
  user?: UserFormUser;
}) {
  return (
    <form action={action} className="mt-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6">
        <label className="grid gap-2 text-lg font-bold text-stone-950">
          Name
          <input name="name" defaultValue={user?.name ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
        </label>

        <label className="grid gap-2 text-lg font-bold text-stone-950">
          Email
          <input name="email" type="email" required defaultValue={user?.email ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
        </label>

        {mode === "create" ? (
          <label className="grid gap-2 text-lg font-bold text-stone-950">
            Temporary Password
            <input name="password" type="password" placeholder="rollfinder-user" className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal" />
          </label>
        ) : null}

        <label className="grid gap-2 text-lg font-bold text-stone-950">
          Role
          <select name="role" defaultValue={user?.role ?? Role.STANDARD_USER} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
            <option value={Role.STANDARD_USER}>Standard user</option>
            <option value={Role.ACADEMY_ADMIN}>Academy admin</option>
            {superAdmin ? <option value={Role.PLATFORM_ADMIN}>Platform admin</option> : null}
            {superAdmin ? <option value={Role.SUPER_ADMIN}>Super admin</option> : null}
            {superAdmin && user?.role === Role.ADMIN ? <option value={Role.ADMIN}>Admin</option> : null}
          </select>
        </label>

        <label className="grid gap-2 text-lg font-bold text-stone-950">
          Academy
          <select name="academyId" defaultValue={user?.academyId ?? ""} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
            <option value="">No academy</option>
            {academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.name}</option>)}
          </select>
        </label>

        {mode === "edit" ? (
          <label className="grid gap-2 text-lg font-bold text-stone-950">
            Status
            <select name="status" defaultValue={user?.status ?? UserStatus.ACTIVE} className="min-h-14 rounded-md border border-stone-300 px-4 text-base font-normal">
              <option value={UserStatus.ACTIVE}>Active</option>
              <option value={UserStatus.DISABLED}>Disabled</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="min-h-12 rounded-md bg-stone-950 px-5 text-sm font-bold text-white">
          {mode === "create" ? "Create User" : "Save Changes"}
        </button>
        <Link href="/admin/users" className="inline-flex min-h-12 items-center rounded-md border border-stone-300 px-5 text-sm font-bold text-stone-800">Cancel</Link>
      </div>
    </form>
  );
}
