export const PAYMENT_METHODS = ['Bevo Pay', 'Cash', 'Credit/Debit', 'Dine In Dollars'] as const;

/** A value of `locations.methods_of_payment`. */
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_ABBREVIATIONS: Record<PaymentMethod, string> = {
  'Bevo Pay': 'BP',
  Cash: 'C',
  'Credit/Debit': 'C/D',
  'Dine In Dollars': 'DiD',
};

export const isPaymentMethod = (value: string): value is PaymentMethod =>
  (PAYMENT_METHODS as readonly string[]).includes(value);
