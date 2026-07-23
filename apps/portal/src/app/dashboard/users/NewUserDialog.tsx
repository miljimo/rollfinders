import { DialogShell } from "@/app/_components/DialogShell";

import { createManagedUser } from "../../admin/users/actions";
import { UserForm } from "../../admin/users/UserForm";

export function NewUserDialog({ academies, academyAdmin, actorRole, superAdmin }: { academies: { id: string; name: string }[]; academyAdmin: boolean; actorRole: string; superAdmin: boolean }) {
  return (
    <DialogShell closeHref="/dashboard/users" description="Create a user and assign role and academy access." title="New User">
      <UserForm
        academies={academies}
        action={createManagedUser}
        cancelHref="/dashboard/users"
        mode="create"
        returnTo="/dashboard/users"
        academyAdmin={academyAdmin}
        actorRole={actorRole}
        superAdmin={superAdmin}
      />
    </DialogShell>
  );
}
