import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('ar-YE', {
    style: 'currency',
    currency: 'YER',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount || 0).replace('YER', 'ر.ي');
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}
