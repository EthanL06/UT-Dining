import type { PaymentMethod } from "@/types/location";

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  avatar: string;
  color: string;
}

export const paymentMethodOptions: PaymentMethodOption[] = [
  { value: "Bevo Pay", label: "Bevo Pay", avatar: "BP", color: "orange" },
  { value: "Cash", label: "Cash", avatar: "C", color: "green" },
  {
    value: "Credit/Debit",
    label: "Credit/Debit",
    avatar: "C/D",
    color: "blue",
  },
  {
    value: "Dine In Dollars",
    label: "Dine In Dollars",
    avatar: "DiD",
    color: "grape",
  },
];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  "Bevo Pay": "Bevo Pay",
  Cash: "Cash",
  "Credit/Debit": "Credit/Debit",
  "Dine In Dollars": "Dine In Dollars",
};

export const paymentMethodAvatars: Record<PaymentMethod, string> = {
  "Bevo Pay": "BP",
  Cash: "C",
  "Credit/Debit": "C/D",
  "Dine In Dollars": "DiD",
};

export const paymentMethodColors: Record<PaymentMethod, string> = {
  "Bevo Pay": "orange",
  Cash: "green",
  "Credit/Debit": "blue",
  "Dine In Dollars": "grape",
};
