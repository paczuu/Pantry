import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Joins class names and resolves conflicting Tailwind utilities
 * (the last one wins), so shared components can be safely overridden.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
