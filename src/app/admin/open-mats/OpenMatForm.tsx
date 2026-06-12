"use client";

import { CourseActivityType, EventAudience, GiType, RecurrenceType, type Academy, type CourseActivity, type Event } from "@prisma/client";
import { type ClipboardEvent, type ReactNode, useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { courseActivityTypeLabels, courseActivityTypeOptions } from "@/lib/course-activities";
import { selectableCourseTypeOptions } from "@/lib/course-types";
import type { InstructorUserOption } from "@/lib/instructor-users";
import type { EventFormState } from "./actions";

type EventAction = (state: EventFormState, formData: FormData) => Promise<EventFormState>;
export type OpenMatFormEvent = Omit<Event, "price"> & { price: string };
type FormCourseActivity = Pick<CourseActivity, "id" | "name" | "activityType" | "startTime" | "endTime" | "description">;

const initialState: EventFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

const formSteps = [
  { id: "basics", label: "Basics" },
  { id: "schedule", label: "Schedule" },
  { id: "activities", label: "Activities" },
  { id: "details", label: "Details" },
  { id: "recurrence", label: "Recurrence" },
  { id: "review", label: "Review" },
] as const;

export function OpenMatForm({
  action,
  academies,
  cancelHref,
  event,
  instructorUsers = [],
  returnTo,
  courseTypeMode = "open-mat",
  submitLabel,
}: {
  action: EventAction;
  academies: Academy[];
  cancelHref?: string;
  event?: OpenMatFormEvent & { activities?: FormCourseActivity[] };
  instructorUsers?: InstructorUserOption[];
  returnTo?: string;
  courseTypeMode?: "open-mat" | "select";
  submitLabel?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const eventDate = event?.eventDate.toISOString().slice(0, 10);
  const recurrenceEndDate = event?.recurrenceEndDate?.toISOString().slice(0, 10);
  const recurrenceInterval = state.values.recurrenceInterval ?? event?.recurrenceInterval?.toString() ?? "1";
  const initialAcademyId = state.values.academyId ?? event?.academyId ?? "";
  const [selectedAcademyId, setSelectedAcademyId] = useState(initialAcademyId);
  const initialPrice = state.values.price ?? event?.price ?? "0";
  const [price, setPrice] = useState(initialPrice);
  const initialCourseType = state.values.courseType ?? event?.courseType ?? "OPEN_MAT";
  const [selectedCourseType, setSelectedCourseType] = useState(String(initialCourseType));
  const initialInstructorIds = instructorIdsFromValue(state.values.instructor ?? event?.instructor ?? "", instructorUsers);
  const [instructorIds, setInstructorIds] = useState(initialInstructorIds.length ? initialInstructorIds : [""]);
  const [activities, setActivities] = useState(() => initialActivities(event?.activities, event?.startTime ?? "18:30", event?.endTime ?? "20:00"));
  const isOpenMat = selectedCourseType === "OPEN_MAT";
  const showCourseSpecificFields = !isOpenMat;
  const showAudience = Number(price) > 0;
  const listingName = isOpenMat ? "Open Mat" : "Course";
  const currentStep = formSteps[stepIndex].id;
  const completedSteps = new Set(formSteps.slice(0, stepIndex).map((step) => step.id));
  const selectAcademy = (academyId: string) => {
    setSelectedAcademyId(academyId);
    setInstructorIds((currentInstructorIds) => {
      const nextInstructorIds = currentInstructorIds.filter((instructorId) => {
        if (!instructorId || !academyId) return true;
        return instructorUsers.find((user) => user.id === instructorId)?.academyIds.includes(academyId);
      });
      return nextInstructorIds.length ? nextInstructorIds : [""];
    });
  };
  const nextStep = () => setStepIndex((index) => Math.min(index + 1, formSteps.length - 1));
  const previousStep = () => setStepIndex((index) => Math.max(index - 1, 0));

  return (
    <form action={formAction} noValidate className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {courseTypeMode === "open-mat" ? <input type="hidden" name="courseType" value="OPEN_MAT" /> : null}
      <div className="border-b border-stone-200 bg-stone-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-stone-600">Step {stepIndex + 1} of {formSteps.length}</p>
          <p className="text-sm font-black text-teal-800">{formSteps[stepIndex].label}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {formSteps.map((step, index) => (
            <button key={step.id} type="button" onClick={() => setStepIndex(index)} className={`min-h-10 rounded-md border px-3 text-sm font-bold ${index === stepIndex ? "border-teal-700 bg-teal-700 text-white" : completedSteps.has(step.id) ? "border-teal-200 bg-teal-50 text-teal-800" : "border-stone-200 bg-white text-stone-600"}`}>
              {step.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-4">
        {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
        <StepPanel active={currentStep === "basics"}>
          <StepSection title="Basics" description="Name the course and describe what visitors should expect.">
            <AcademySearchSelect academies={academies} errors={state.fieldErrors.academyId} selectedAcademyId={selectedAcademyId} onSelectedAcademyIdChange={selectAcademy} />
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field name="title" label={isOpenMat ? "Title" : "Course Name"} value={state.values.title ?? event?.title} errors={state.fieldErrors.title} />
              {courseTypeMode === "select" ? (
                <label className="grid gap-1 text-sm font-semibold text-stone-800">
                  Course Type
                  <select name="courseType" required value={selectedCourseType} onChange={(event) => setSelectedCourseType(event.currentTarget.value)} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
                    {selectableCourseTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <FieldError errors={state.fieldErrors.courseType} />
                </label>
              ) : null}
            </div>
            <label className="grid gap-1 text-sm font-semibold text-stone-800">
              Description
              <textarea name="description" required defaultValue={state.values.description ?? event?.description} onPaste={pastePlainText} className="min-h-48 rounded-md border border-stone-300 px-3 py-2 text-base font-normal md:min-h-64" />
              <FieldError errors={state.fieldErrors.description} />
              <span className="text-xs font-medium text-stone-600">Links are pasted as plain text. Use http, https, mailto, or tel links only.</span>
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <input name="active" type="hidden" value="off" />
              <input name="active" type="checkbox" defaultChecked={state.values.active ? state.values.active === "on" : event?.active ?? true} className="size-4 accent-teal-700" />
              Active listing
            </label>
          </StepSection>
        </StepPanel>
        <StepPanel active={currentStep === "schedule"}>
          <StepSection title="Schedule And Pricing" description="Set when the session happens and what visitors pay.">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Field name="eventDate" label="Date" type="date" value={state.values.eventDate ?? eventDate} errors={state.fieldErrors.eventDate} />
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                Gi Type
                <select name="giType" required defaultValue={state.values.giType ?? event?.giType ?? GiType.BOTH} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
                  <option value={GiType.BOTH}>Both</option>
                  <option value={GiType.GI}>Gi</option>
                  <option value={GiType.NO_GI}>No-Gi</option>
                </select>
                <FieldError errors={state.fieldErrors.giType} />
              </label>
              <Field name="startTime" label="Start Time" type="time" value={state.values.startTime ?? event?.startTime ?? "18:30"} errors={state.fieldErrors.startTime} />
              <Field name="endTime" label="End Time" type="time" value={state.values.endTime ?? event?.endTime ?? "20:00"} errors={state.fieldErrors.endTime} />
              <Field name="price" label={isOpenMat ? "Drop-in Cost" : "Price"} type="number" value={initialPrice} onChange={(value) => setPrice(value)} errors={state.fieldErrors.price} />
              <Field name="capacity" label="Capacity" type="number" value={state.values.capacity ?? event?.capacity?.toString() ?? ""} required={false} errors={state.fieldErrors.capacity} />
            </div>
            {showAudience ? (
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                {isOpenMat ? "Drop-in Audience" : "Price Audience"}
                <select name="audience" required defaultValue={state.values.audience ?? event?.audience ?? EventAudience.EXTERNAL_ONLY} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
                  <option value={EventAudience.EXTERNAL_ONLY}>External visitors only</option>
                  <option value={EventAudience.EXTERNAL_AND_MEMBERS}>External visitors and academy members</option>
                </select>
                <span className="text-xs font-medium text-stone-600">Choose whether academy members also pay this {isOpenMat ? "drop-in fee" : "price"}.</span>
                <FieldError errors={state.fieldErrors.audience} />
              </label>
            ) : (
              <input type="hidden" name="audience" value={EventAudience.EXTERNAL_ONLY} />
            )}
          </StepSection>
        </StepPanel>
        <StepPanel active={currentStep === "activities"}>
          <StepSection title="Course Schedule" description="Add the activities that happen inside this course. They will be shown chronologically.">
            <CourseActivitiesField activities={activities} errors={state.fieldErrors.activities} setActivities={setActivities} />
          </StepSection>
        </StepPanel>
        <StepPanel active={currentStep === "details"}>
          <StepSection title="Course Details" description={showCourseSpecificFields ? "Add instructors, contact details, and location overrides." : "Open Mats use academy defaults unless changed into another course type."}>
            {showCourseSpecificFields ? (
              <div className="grid gap-5">
                <InstructorListField academyId={selectedAcademyId} errors={state.fieldErrors.instructor} instructorIds={instructorIds} instructorUsers={instructorUsers} setInstructorIds={setInstructorIds} />
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <Field name="contactEmail" label="Contact Email" type="email" value={state.values.contactEmail ?? event?.contactEmail ?? ""} required={false} errors={state.fieldErrors.contactEmail} />
                  <Field name="contactPhone" label="Contact Phone" value={state.values.contactPhone ?? event?.contactPhone ?? ""} required={false} errors={state.fieldErrors.contactPhone} />
                </div>
                <div className="grid items-start gap-4 sm:grid-cols-2">
                  <Field name="locationName" label="Location Name" value={state.values.locationName ?? event?.locationName ?? ""} required={false} errors={state.fieldErrors.locationName} />
                  <Field name="addressOverride" label="Location Address Override" value={state.values.addressOverride ?? event?.addressOverride ?? ""} required={false} errors={state.fieldErrors.addressOverride} />
                </div>
              </div>
            ) : (
              <p className="rounded-md bg-stone-50 p-3 text-sm font-semibold text-stone-700">Change Course Type from Open Mat to add instructors, contact details, and location overrides.</p>
            )}
          </StepSection>
        </StepPanel>
        <StepPanel active={currentStep === "recurrence"}>
          <StepSection title="Recurrence" description="Create one source listing and derive future visible occurrences.">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)]">
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                Repeats
                <select name="recurrenceType" defaultValue={state.values.recurrenceType ?? event?.recurrenceType ?? RecurrenceType.NONE} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
                  <option value={RecurrenceType.NONE}>Does not repeat</option>
                  <option value={RecurrenceType.WEEKLY}>Weekly</option>
                  <option value={RecurrenceType.MONTHLY}>Monthly</option>
                </select>
                <FieldError errors={state.fieldErrors.recurrenceType} />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-stone-800">
                Repeat Every
                <input name="recurrenceInterval" type="number" min="1" max="52" step="1" defaultValue={recurrenceInterval} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
                <FieldError errors={state.fieldErrors.recurrenceInterval} />
              </label>
            </div>
            <span className="text-xs font-medium text-stone-600">Recurring open mats use one source listing. Use 1 for every week/month, 2 for fortnightly or every 2 months, 3 for every 3 weeks/months.</span>
            <input type="hidden" name="recurrenceLimit" value="" />
            <Field name="recurrenceEndDate" label="Repeat Until" type="date" value={state.values.recurrenceEndDate ?? recurrenceEndDate ?? ""} required={false} errors={state.fieldErrors.recurrenceEndDate} />
          </StepSection>
        </StepPanel>
        <StepPanel active={currentStep === "review"}>
          <StepSection title="Review" description="Confirm the course information before saving.">
            <div className="grid gap-3 text-sm">
              {formSteps.filter((step) => step.id !== "review").map((step, index) => (
                <div key={step.id} className="flex items-center justify-between rounded-md border border-stone-200 p-3">
                  <div>
                    <p className="font-black text-stone-950">{step.label}</p>
                    <p className="text-stone-600">{index < stepIndex ? "Ready for review" : "Review before saving"}</p>
                  </div>
                  <button type="button" onClick={() => setStepIndex(index)} className="text-sm font-bold text-teal-800">Edit</button>
                </div>
              ))}
            </div>
          </StepSection>
        </StepPanel>
      </div>
      <div className="flex flex-wrap justify-between gap-3 border-t border-stone-200 bg-stone-50 p-4">
        <button type="button" onClick={previousStep} disabled={stepIndex === 0} className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-bold text-stone-800 disabled:text-stone-400">Back</button>
        <div className="flex flex-wrap gap-3">
          {cancelHref ? <Button href={cancelHref} variant="secondary">Cancel</Button> : null}
          {currentStep === "review" ? (
            <Button type="submit" disabled={isPending} variant="primary">
              {isPending ? "Saving..." : submitLabel ?? `Save ${listingName}`}
            </Button>
          ) : (
            <button type="button" onClick={nextStep} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white">Next</button>
          )}
        </div>
      </div>
    </form>
  );
}

function StepPanel({ active, children }: { active: boolean; children: ReactNode }) {
  return <div className={active ? "block" : "hidden"}>{children}</div>;
}

function StepSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
  return (
    <section className="grid gap-4">
      <div>
        <h3 className="text-lg font-black text-stone-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold text-stone-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

type ActivityRow = {
  key: string;
  id?: string;
  name: string;
  activityType: CourseActivityType;
  startTime: string;
  endTime: string;
  description: string;
};

function CourseActivitiesField({ activities, errors, setActivities }: { activities: ActivityRow[]; errors?: string[]; setActivities: (activities: ActivityRow[]) => void }) {
  const issue = activityIssue(errors?.[0], activities);
  const updateActivity = (index: number, patch: Partial<ActivityRow>) => {
    setActivities(activities.map((activity, activityIndex) => activityIndex === index ? { ...activity, ...patch } : activity));
  };
  const addActivity = () => {
    const lastActivity = activities.at(-1);
    setActivities([...activities, {
      key: `new-activity-${Date.now()}-${activities.length}`,
      name: "",
      activityType: CourseActivityType.ROLLING,
      startTime: lastActivity?.endTime ?? "18:30",
      endTime: lastActivity?.endTime ?? "19:00",
      description: "",
    }]);
  };
  const removeActivity = (index: number) => setActivities(activities.filter((_, activityIndex) => activityIndex !== index));

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-stone-800">Activities</span>
        <button type="button" onClick={addActivity} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-700 px-3 text-sm font-bold text-teal-800 hover:bg-teal-50">
          <Plus size={16} aria-hidden />
          Add Activity
        </button>
      </div>
      {errors?.length ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
          {errors[0]}
        </div>
      ) : null}
      {activities.length ? (
        <div className="overflow-x-auto rounded-md border border-stone-200">
          <table className="w-full min-w-[920px] border-collapse text-left text-sm">
            <thead className="bg-stone-50 text-xs font-black uppercase text-stone-600">
              <tr>
                <th className="w-12 border-b border-stone-200 px-3 py-3">#</th>
                <th className="min-w-48 border-b border-stone-200 px-3 py-3">Activity Name</th>
                <th className="min-w-44 border-b border-stone-200 px-3 py-3">Activity Type</th>
                <th className="w-36 border-b border-stone-200 px-3 py-3">Start</th>
                <th className="w-36 border-b border-stone-200 px-3 py-3">End</th>
                <th className="min-w-64 border-b border-stone-200 px-3 py-3">Description</th>
                <th className="w-28 border-b border-stone-200 px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((activity, index) => {
                const rowHasIssue = issue?.rowIndex === index;
                return (
                  <tr key={activity.key} className={rowHasIssue ? "bg-red-50/70" : "bg-white"}>
                    <td className="border-b border-stone-200 px-3 py-3 align-top font-black text-stone-950">
                      {index + 1}
                      <input type="hidden" name="activityId" value={activity.id ?? ""} />
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 align-top">
                      <input
                        name="activityName"
                        value={activity.name}
                        onChange={(event) => updateActivity(index, { name: event.currentTarget.value })}
                        aria-invalid={rowHasIssue && issue.field === "name" ? "true" : undefined}
                        className={activityInputClass(rowHasIssue && issue.field === "name")}
                        placeholder={courseActivityTypeLabels[activity.activityType]}
                      />
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 align-top">
                      <select
                        name="activityType"
                        required
                        value={activity.activityType}
                        onChange={(event) => updateActivity(index, { activityType: event.currentTarget.value as CourseActivityType })}
                        aria-invalid={rowHasIssue && issue.field === "type" ? "true" : undefined}
                        className={activityInputClass(rowHasIssue && issue.field === "type")}
                      >
                        {courseActivityTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 align-top">
                      <input
                        name="activityStartTime"
                        type="time"
                        required
                        value={activity.startTime}
                        onChange={(event) => updateActivity(index, { startTime: event.currentTarget.value })}
                        aria-invalid={rowHasIssue && issue.field === "time" ? "true" : undefined}
                        className={activityInputClass(rowHasIssue && issue.field === "time")}
                      />
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 align-top">
                      <input
                        name="activityEndTime"
                        type="time"
                        required
                        value={activity.endTime}
                        onChange={(event) => updateActivity(index, { endTime: event.currentTarget.value })}
                        aria-invalid={rowHasIssue && (issue.field === "time" || issue.field === "endTime") ? "true" : undefined}
                        className={activityInputClass(rowHasIssue && (issue.field === "time" || issue.field === "endTime"))}
                      />
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 align-top">
                      <textarea
                        name="activityDescription"
                        value={activity.description}
                        onChange={(event) => updateActivity(index, { description: event.currentTarget.value })}
                        className="min-h-11 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-normal"
                      />
                    </td>
                    <td className="border-b border-stone-200 px-3 py-3 text-right align-top">
                      <button type="button" onClick={() => removeActivity(index)} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-bold text-stone-700">
                        <Trash2 size={15} aria-hidden />
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md bg-stone-50 p-3 text-sm font-semibold text-stone-700">No activities added. The course will still work normally.</p>
      )}
    </div>
  );
}

function activityInputClass(hasIssue?: boolean) {
  return `min-h-11 w-full rounded-md border px-3 text-sm font-normal ${hasIssue ? "border-red-500 bg-white ring-2 ring-red-100" : "border-stone-300"}`;
}

function activityIssue(message: string | undefined, activities: ActivityRow[]) {
  if (!message) return null;
  const activityMatch = /^Activity (\d+)/.exec(message);
  const rowIndex = activityMatch ? Number(activityMatch[1]) - 1 : activities.findIndex((activity) => message.startsWith(activity.name || courseActivityTypeLabels[activity.activityType]));
  if (rowIndex < 0) return null;
  if (/Activity Type/.test(message)) return { rowIndex, field: "type" as const };
  if (/Activity Name|custom Activity Name/.test(message)) return { rowIndex, field: "name" as const };
  if (/valid start and end times|overlaps|fit within/.test(message)) return { rowIndex, field: "time" as const };
  if (/end after it starts/.test(message)) return { rowIndex, field: "endTime" as const };
  return { rowIndex, field: "time" as const };
}

function InstructorListField({ academyId, errors, instructorIds, instructorUsers, setInstructorIds }: { academyId: string; errors?: string[]; instructorIds: string[]; instructorUsers: InstructorUserOption[]; setInstructorIds: (instructorIds: string[]) => void }) {
  const visibleInstructorUsers = academyId ? instructorUsers.filter((user) => user.academyIds.includes(academyId)) : instructorUsers;
  const instructorOptions: AutoCompleteTextFieldOption[] = visibleInstructorUsers.map((user) => ({
    id: user.id,
    label: user.name ?? user.email,
    description: user.name ? user.email : undefined,
    meta: user.email,
  }));
  const selectedInstructorUsers = instructorIds.map((id) => instructorUsers.find((user) => user.id === id)).filter((user): user is InstructorUserOption => Boolean(user));
  const selectedInstructorLabels = selectedInstructorUsers.map(instructorUserLabel);
  const updateInstructor = (index: number, value: string) => {
    setInstructorIds(instructorIds.map((instructorId, instructorIndex) => instructorIndex === index ? value : instructorId));
  };
  const removeInstructor = (index: number) => {
    const nextInstructorIds = instructorIds.filter((_, instructorIndex) => instructorIndex !== index);
    setInstructorIds(nextInstructorIds.length ? nextInstructorIds : [""]);
  };
  const serializedInstructors = selectedInstructorLabels.join(", ");

  return (
    <div className="grid gap-2">
      <input type="hidden" name="instructor" value={serializedInstructors} />
      {selectedInstructorUsers.map((instructor) => <input key={instructor.id} type="hidden" name="instructorUserIds" value={instructor.id} />)}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-stone-800">Instructors</span>
        <button type="button" onClick={() => setInstructorIds([...instructorIds, ""])} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-700 px-3 text-sm font-bold text-teal-800 hover:bg-teal-50">
          <Plus size={16} aria-hidden />
          Add Instructor
        </button>
      </div>
      <div className="grid gap-3">
        {instructorIds.map((instructorId, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <AutoCompleteTextField
              emptyMessage="No users found."
              errors={errors}
              label={`Instructor ${index + 1}`}
              maxResults={12}
              name={`instructorSearch-${index}`}
              onSelectedIdChange={(selectedId) => updateInstructor(index, selectedId)}
              options={instructorOptions}
              placeholder="Search users by name or email"
              selectedId={instructorId}
            />
            <button type="button" onClick={() => removeInstructor(index)} disabled={instructorIds.length === 1 && !instructorId} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-stone-300 px-3 text-sm font-bold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 size={16} aria-hidden />
              Remove
            </button>
          </div>
        ))}
      </div>
      {!visibleInstructorUsers.length ? <p className="text-xs font-medium text-stone-600">No system users are available for the selected academy yet.</p> : null}
      <FieldError errors={errors} />
    </div>
  );
}

function AcademySearchSelect({ academies, errors, onSelectedAcademyIdChange, selectedAcademyId }: { academies: Academy[]; errors?: string[]; onSelectedAcademyIdChange: (academyId: string) => void; selectedAcademyId: string }) {
  const options: AutoCompleteTextFieldOption[] = academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
    description: `${academy.city}, ${academy.postcode}`,
    meta: `${academy.city} ${academy.postcode}`,
  }));

  return (
    <AutoCompleteTextField
      label="Academy"
      name="academyId"
      options={options}
      selectedId={selectedAcademyId}
      onSelectedIdChange={onSelectedAcademyIdChange}
      placeholder="Search academy by name, city, or postcode"
      emptyMessage="No academies found."
      errors={errors}
    />
  );
}

function instructorUserLabel(user: InstructorUserOption) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

function instructorIdsFromValue(value: string, instructorUsers: InstructorUserOption[]) {
  const names = value.split(/[,;\n]/).map((instructor) => instructor.trim()).filter(Boolean);
  return names.map((name) => instructorUsers.find((user) => instructorUserLabel(user) === name || user.name === name || user.email === name)?.id).filter((id): id is string => Boolean(id));
}

function initialActivities(activities: FormCourseActivity[] | undefined, startTime: string, endTime: string): ActivityRow[] {
  if (activities?.length) {
    return [...activities]
      .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))
      .map((activity) => ({
        key: activity.id,
        id: activity.id,
        name: activity.name,
        activityType: activity.activityType,
        startTime: activity.startTime,
        endTime: activity.endTime,
        description: activity.description ?? "",
      }));
  }

  return [{
    key: "new-activity-0",
    name: "Open Rolling",
    activityType: CourseActivityType.ROLLING,
    startTime,
    endTime,
    description: "",
  }];
}

function Field({ name, label, value, required = true, type = "text", errors, onChange }: { name: string; label: string; value?: string; required?: boolean; type?: string; errors?: string[]; onChange?: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input name={name} type={type} required={required} defaultValue={value} onChange={(event) => onChange?.(event.currentTarget.value)} aria-invalid={errors ? "true" : undefined} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
      <FieldError errors={errors} />
    </label>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs font-semibold text-red-700">{errors[0]}</span>;
}

function pastePlainText(event: ClipboardEvent<HTMLTextAreaElement>) {
  const text = event.clipboardData.getData("text/plain");
  if (!text) return;

  event.preventDefault();
  const textarea = event.currentTarget;
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
