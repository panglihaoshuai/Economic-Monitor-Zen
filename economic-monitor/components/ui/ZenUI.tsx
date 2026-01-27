import React from 'react';
import { cn } from '@/lib/utils';

// ========== Card Component ==========

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    active?: boolean;
}

export function ZenCard({ className, active, children, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "zen-card",
                active && "zen-card-active",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}

// ========== Button Component ==========

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export function ZenButton({
    className,
    variant = 'primary',
    size = 'md',
    ...props
}: ButtonProps) {
    const variantStyles = {
        primary: "btn-primary",
        secondary: "btn-secondary",
        ghost: "btn-ghost",
    };

    const sizeStyles = {
        sm: "text-xs px-3 py-1.5",
        md: "",
        lg: "text-base px-6 py-3",
    };

    return (
        <button
            className={cn(
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            {...props}
        />
    );
}

// ========== Badge Component ==========

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'sage' | 'terracotta' | 'neutral';
}

export function ZenBadge({
    className,
    variant = 'neutral',
    ...props
}: BadgeProps) {
    const variantStyles = {
        sage: "badge-sage",
        terracotta: "badge-terracotta",
        neutral: "badge-neutral",
    };

    return (
        <span
            className={cn(
                "badge",
                variantStyles[variant],
                className
            )}
            {...props}
        />
    );
}

// ========== Spinner Component ==========

export function ZenSpinner({ className }: { className?: string }) {
    return (
        <div className={cn("animate-spin rounded-full h-5 w-5 border-b-2 border-current", className)} />
    );
}
