
"use client";

import { type ReactNode } from "react";
import { Building2, CalendarDays, CreditCard,
     ClipboardCheck, HelpCircle, Home, LogOut, Map, Menu, Settings, Users, X } from "lucide-react";



export type SidePanelIcon = "academies" | "claims"
    | "dashboard" | "events" | "help" | "logout" | "map" | "payments" | "settings" | "users";



type IconProps = {
    name: SidePanelIcon
    size?: number
    className?: string
    ariaHidden?: boolean
}
export const Icon = ({ name, size = 20, className = "shrink-0", ariaHidden = true }: IconProps) => {

    const iconProps = {
        size: size,
        "aria-hidden": ariaHidden,
        className: className
    } as const;

    const icons: Record<SidePanelIcon, ReactNode> = {
        academies: <Building2 {...iconProps} />,
        claims: <ClipboardCheck {...iconProps} />,
        dashboard: <Home {...iconProps} />,
        events: <CalendarDays {...iconProps} />,
        help: <HelpCircle {...iconProps} />,
        logout: <LogOut {...iconProps} />,
        map: <Map {...iconProps} />,
        payments: <CreditCard {...iconProps} />,
        settings: <Settings {...iconProps} />,
        users: <Users {...iconProps} />,
    };


    return icons[name];
}
