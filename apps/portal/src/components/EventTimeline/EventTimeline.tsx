"use client";

import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";

export type EventTimelineActivity = {
  activityTypeLabel?: string;
  endTime: string;
  id: string;
  name: string;
  startTime: string;
};

export type EventTimelineProps = {
  activities: EventTimelineActivity[];
  className?: string;
  eventDate?: Date | string;
  endLabel?: string;
  now?: Date;
};

function minutesFromTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

function eventDateMatchesNow(eventDate: Date | string | undefined, now: Date) {
  if (!eventDate) return true;
  const parsed = eventDate instanceof Date ? eventDate : new Date(eventDate);
  if (Number.isNaN(parsed.getTime())) return true;
  return dateKey(parsed) === dateKey(now);
}

function minutesNow(value: Date) {
  return value.getHours() * 60 + value.getMinutes();
}

function activityState(activity: EventTimelineActivity, now: Date, eventDate: Date | string | undefined) {
  const start = minutesFromTime(activity.startTime);
  const end = minutesFromTime(activity.endTime);
  if (start === null || end === null || !eventDateMatchesNow(eventDate, now)) return "upcoming";
  const current = minutesNow(now);
  if (current >= start && current < end) return "current";
  if (current >= end) return "complete";
  return "upcoming";
}

export function EventTimeline({ activities, className, eventDate, endLabel = "Session End", now }: EventTimelineProps) {
  const [liveTime, setLiveTime] = useState(() => new Date());
  const timelineActivities = useMemo(() => activities.filter((activity) => activity.startTime && activity.endTime), [activities]);
  const currentTime = now ?? liveTime;

  useEffect(() => {
    if (now) return;
    const timer = window.setInterval(() => setLiveTime(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [now]);

  if (!timelineActivities.length) return null;

  const sessionEnd = timelineActivities.at(-1)?.endTime;

  return (
    <div className={clsx("w-full max-w-full overflow-x-auto", className)} aria-live="polite">
      <ol className="flex min-w-max border-b border-stone-200 pb-4">
        {timelineActivities.map((activity) => {
          const state = activityState(activity, currentTime, eventDate);
          const highlighted = state === "current";
          const completed = state === "complete";

          return (
            <li key={activity.id} className="relative min-w-max shrink-0 pr-10">
              <div className={clsx("text-sm font-bold leading-5", highlighted ? "text-teal-800" : completed ? "text-stone-500" : "text-stone-600")}>
                {activity.startTime}
              </div>
              <div className="relative mt-1 border-l border-stone-300 pb-1 pl-10 pt-0.5">
                <span
                  className={clsx(
                    "absolute -left-[7px] top-1 size-3.5 rounded-full",
                    highlighted ? "bg-teal-700 ring-4 ring-teal-50" : completed ? "bg-teal-700" : "bg-stone-300",
                  )}
                  aria-hidden
                />
                <p className={clsx("whitespace-nowrap text-base font-bold leading-6", highlighted ? "text-teal-900" : "text-stone-950")}>{activity.name}</p>
                {activity.activityTypeLabel ? <p className="mt-2 text-sm uppercase text-stone-600">{activity.activityTypeLabel}</p> : null}
              </div>
            </li>
          );
        })}
        {sessionEnd ? (
          <li className="relative min-w-max shrink-0 pr-10">
            <div className="text-sm font-bold leading-5 text-stone-500">{sessionEnd}</div>
            <div className="relative mt-1 border-l border-stone-300 pb-1 pl-10 pt-0.5">
              <span className="absolute -left-[7px] top-1 size-3.5 rounded-full bg-stone-300" aria-hidden />
              <p className="whitespace-nowrap text-base font-bold leading-6 text-stone-950">{endLabel}</p>
            </div>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
