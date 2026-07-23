
"use client";

import { type ReactNode } from "react";
import {
    ArrowLeftRight,
    Banknote,
    BadgeCheck,
    Building2,
    CalendarDays,
    CheckSquare,
    CreditCard,
    ClipboardCheck,
    Gauge,
    HelpCircle,
    Home,
    KeyRound,
    Landmark,
    ListChecks,
    LockKeyhole,
    LogOut,
    Map,
    Package,
    Settings,
    ShieldCheck,
    TrendingDown,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";



export type SidePanelIcon = "academies" | "claims"
    | "accessKeys" | "approvals" | "bookings" | "dashboard" | "downgrades" | "entitlements" | "events" | "features" | "help" | "limits" | "logout" | "map" | "mfa" | "payments" | "plans" | "products" | "payouts" | "permissions" | "reserves" | "roles" | "settings" | "subscribers" | "transactions" | "transfers" | "users" | "wallet";



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
        downgrades: <TrendingDown {...iconProps} />,
        entitlements: <BadgeCheck {...iconProps} />,
        events: <CalendarDays {...iconProps} />,
        features: <ListChecks {...iconProps} />,
        help: <HelpCircle {...iconProps} />,
        limits: <Gauge {...iconProps} />,
        logout: <LogOut {...iconProps} />,
        map: <Map {...iconProps} />,
        mfa: <ShieldCheck {...iconProps} />,
        payments: <CreditCard {...iconProps} />,
        plans: <ClipboardCheck {...iconProps} />,
        products: <Package {...iconProps} />,
        payouts: <Landmark {...iconProps} />,
        permissions: <LockKeyhole {...iconProps} />,
        reserves: <LockKeyhole {...iconProps} />,
        roles: <UserCog {...iconProps} />,
        settings: <Settings {...iconProps} />,
        subscribers: <Users {...iconProps} />,
        transactions: <Banknote {...iconProps} />,
        transfers: <ArrowLeftRight {...iconProps} />,
        users: <Users {...iconProps} />,
        wallet: <Wallet {...iconProps} />,
    };


    return icons[name];
}
