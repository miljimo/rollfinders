export type InstructorUserOption = {
  id: string;
  name: string | null;
  email: string;
  academyIds: string[];
};

export function instructorUserAcademyWhere(_academyIds: string[]) {
  return {};
}

export async function getInstructorUserOptions(_userWhere: unknown): Promise<InstructorUserOption[]> {
  return [];
}
