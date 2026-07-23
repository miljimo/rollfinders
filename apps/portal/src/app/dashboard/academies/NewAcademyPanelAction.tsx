import { Plus } from "lucide-react";
import { Button } from "@/app/_components/Button";

export function NewAcademyPanelAction() {
  return (
    <Button href="/dashboard/academies?dialog=new-academy" variant="primary" className="min-h-12 shadow-sm">
      <Plus size={18} aria-hidden />
      New Academy
    </Button>
  );
}
