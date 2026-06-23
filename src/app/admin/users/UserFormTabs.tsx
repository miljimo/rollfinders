"use client";

import type { ReactNode } from "react";
import { useState } from "react";

export function UserFormTabs({
  detailsPanel,
  initialTab = "details",
  permissionsPanel,
}: {
  detailsPanel: ReactNode;
  initialTab?: "details" | "permissions";
  permissionsPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "permissions">(initialTab);

  return (
    <div className="mt-8">
      <div className="mb-5 inline-flex rounded-lg border border-stone-200 bg-white p-1 shadow-sm" role="tablist" aria-label="Edit user sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          onClick={() => setActiveTab("details")}
          className={`min-h-11 rounded-md px-5 text-sm font-black ${activeTab === "details" ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-50"}`}
        >
          User Details
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "permissions"}
          onClick={() => setActiveTab("permissions")}
          className={`min-h-11 rounded-md px-5 text-sm font-black ${activeTab === "permissions" ? "bg-stone-950 text-white" : "text-stone-700 hover:bg-stone-50"}`}
        >
          Permissions
        </button>
      </div>

      {activeTab === "details" ? detailsPanel : permissionsPanel}
    </div>
  );
}
