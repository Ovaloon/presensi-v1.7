import React from "react";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface PageHeaderKpiItem {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  color?: "primary" | "emerald" | "amber" | "blue" | "rose" | "purple" | "indigo";
}

interface PageHeaderProps {
  icon: LucideIcon;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  badge?: string | React.ReactNode;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive";
  badgeClassName?: string;
  children?: React.ReactNode;
  kpiCards?: PageHeaderKpiItem[];
  className?: string;
}

const COLOR_MAP = {
  primary: "bg-primary/10 text-primary border-primary/20",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
};

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
  badgeVariant = "secondary",
  badgeClassName = "bg-primary/10 text-primary border-primary/20",
  children,
  kpiCards,
  className = "",
}: PageHeaderProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4.5">
        <div className="flex items-start gap-3 sm:gap-3.5">
          <div className="size-10 sm:size-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5">
            <Icon className="size-5 sm:size-5.5" />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground font-display">
                {title}
              </h1>
              {badge && (
                <Badge
                  variant={badgeVariant}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${badgeClassName}`}
                >
                  {badge}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        {children && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            {children}
          </div>
        )}
      </div>

      {/* KPI Cards Row (If provided) */}
      {kpiCards && kpiCards.length > 0 && (
        <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-${Math.min(kpiCards.length, 4)} gap-3 sm:gap-4`}>
          {kpiCards.map((kpi, idx) => {
            const KpiIcon = kpi.icon;
            const colorClass = COLOR_MAP[kpi.color || "primary"];
            return (
              <div
                key={idx}
                className="p-4 sm:p-4.5 rounded-2xl border bg-card shadow-xs flex items-center justify-between transition-all hover:shadow-sm"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {kpi.label}
                  </p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tracking-tight text-foreground">
                    {kpi.value}
                  </p>
                  {kpi.helper && (
                    <p className="text-[11px] text-muted-foreground truncate">{kpi.helper}</p>
                  )}
                </div>
                <div
                  className={`size-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ml-2 ${colorClass}`}
                >
                  <KpiIcon className="size-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
