"use client";

import { Button } from "@/components/Button";
import { Role } from "@prisma/client";
import { useState } from "react";
import { createManagedUser } from "./actions";

export function CreateUserForm({
  academies,
  superAdmin,
}: {
  academies: Array<{ id: string; name: string }>;
  superAdmin: boolean;
}) {
  const [role, setRole] = useState<Role>(Role.STANDARD_USER);
  const requiresAcademy = !superAdmin || role === Role.STANDARD_USER;

  return (
    <form action={createManagedUser} className="mt-6 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-6">
      <input name="name" placeholder="Name" className="min-h-11 rounded-md border border-stone-300 px-3 text-sm" />
      <input name="email" type="email" required placeholder="Email" className="min-h-11 rounded-md border border-stone-300 px-3 text-sm" />
      <input name="password" type="password" placeholder="Temporary password" className="min-h-11 rounded-md border border-stone-300 px-3 text-sm" />
      {superAdmin ? (
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="min-h-11 rounded-md border border-stone-300 px-3 text-sm"
        >
          <option value={Role.STANDARD_USER}>Standard user</option>
          <option value={Role.PLATFORM_ADMIN}>Platform admin</option>
        </select>
      ) : (
        <input type="hidden" name="role" value={Role.STANDARD_USER} />
      )}
      <select
        key={requiresAcademy ? "academy-required" : "academy-optional"}
        name="academyId"
        disabled={!requiresAcademy}
        required={requiresAcademy}
        className="min-h-11 rounded-md border border-stone-300 px-3 text-sm disabled:bg-stone-100 disabled:text-stone-500"
      >
        <option value="">{requiresAcademy ? "Assign academy" : "No academy needed"}</option>
        {requiresAcademy ? academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.name}</option>) : null}
      </select>
      <Button type="submit" variant="neutral">Create User</Button>
    </form>
  );
}
