import type { SidePanelIcon } from "@/components/Icons";

export type SidePanelItem = {
  href: string;
  icon: SidePanelIcon;
  label: string;
  active?: boolean;
  children?: SidePanelChildItem[];
};

export type SidePanelChildItem = {
  href: string;
  icon?: SidePanelIcon;
  label: string;
  active?: boolean;
};
