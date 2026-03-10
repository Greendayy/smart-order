export type Cents = number & { readonly __brand: unique symbol };

export function cents(value: number): Cents {
  if (!Number.isFinite(value)) throw new Error("Invalid cents value");
  if (!Number.isInteger(value)) throw new Error("Cents must be an integer");
  return value as Cents;
}

export function addCents(a: Cents, b: Cents): Cents {
  return cents(a + b);
}

export function subCents(a: Cents, b: Cents): Cents {
  return cents(a - b);
}

export function mulCents(amount: Cents, multiplier: number): Cents {
  if (!Number.isFinite(multiplier)) throw new Error("Invalid multiplier");
  return cents(Math.round(amount * multiplier));
}

