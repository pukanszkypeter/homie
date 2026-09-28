const HUF = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
  useGrouping: "always", // Hungarian skips the separator in 4-digit numbers by default
});
const PLAIN = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0, useGrouping: "always" });
const QUANTITY = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });
const UNIT_PRICE = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 2 });

/** "25 690 Ft" */
export const formatHuf = (amount: number) => HUF.format(amount);

/** "25 690", for table cells where the header already says Ft. */
export const formatAmount = (amount: number) => PLAIN.format(amount);

export const formatQuantity = (quantity: number, unit: string) =>
  `${QUANTITY.format(quantity)} ${unit}`;

/** "5,5", for table cells where the row already names the unit. */
export const formatQuantityValue = (quantity: number) => QUANTITY.format(quantity);

/** "182,5 Ft/kWh" */
export const formatUnitPrice = (price: number, unit: string) =>
  `${UNIT_PRICE.format(price)} Ft/${unit}`;
