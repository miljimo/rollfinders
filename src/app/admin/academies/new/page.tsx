import { redirect } from "next/navigation";

export default async function NewAcademyPage() {
  redirect("/admin?panel=academies&dialog=new-academy");
}
