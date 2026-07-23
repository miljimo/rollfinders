import { DialogShell } from "@/app/_components/DialogShell";

import { createAcademy } from "../../admin/academies/actions";
import { AcademyForm } from "../../admin/academies/AcademyForm";

export function NewAcademyDialog() {
  return (
    <DialogShell closeHref="/dashboard/academies" description="Create an academy record without leaving the dashboard." maxWidthClass="max-w-6xl" title="New Academy">
      <AcademyForm action={createAcademy} cancelHref="/dashboard/academies" returnTo="/dashboard/academies" />
    </DialogShell>
  );
}
