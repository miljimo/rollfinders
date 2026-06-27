
"use client";

import { type ReactNode } from "react";
import {
    ArrowLeftRight,
    Banknote,
    Building2,
    CalendarDays,
    CheckSquare,
    CreditCard,
    ClipboardCheck,
    HelpCircle,
    Home,
    KeyRound,
    Landmark,
    LockKeyhole,
    LogOut,
    Map,
    Settings,
    ShieldCheck,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";



export type SidePanelIcon = "academies" | "claims"
    | "accessKeys" | "approvals" | "bookings" | "dashboard" | "events" | "help" | "logout" | "map" | "mfa" | "payments" | "payouts" | "permissions" | "reserves" | "roles" | "settings" | "transactions" | "transfers" | "users" | "wallet";



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
        accessKeys: <KeyRound {...iconProps} />,
        approvals: <CheckSquare {...iconProps} />,
        bookings: <ClipboardCheck {...iconProps} />,
        claims: <ClipboardCheck {...iconProps} />,
        dashboard: <Home {...iconProps} />,
        events: <CalendarDays {...iconProps} />,
        help: <HelpCircle {...iconProps} />,
        logout: <LogOut {...iconProps} />,
        map: <Map {...iconProps} />,
        mfa: <ShieldCheck {...iconProps} />,
        payments: <CreditCard {...iconProps} />,
        payouts: <Landmark {...iconProps} />,
        permissions: <LockKeyhole {...iconProps} />,
        reserves: <LockKeyhole {...iconProps} />,
        roles: <UserCog {...iconProps} />,
        settings: <Settings {...iconProps} />,
        transactions: <Banknote {...iconProps} />,
        transfers: <ArrowLeftRight {...iconProps} />,
        users: <Users {...iconProps} />,
        wallet: <Wallet {...iconProps} />,
    };


    return icons[name];
}
