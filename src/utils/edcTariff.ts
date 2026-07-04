/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EDCSlab } from '../types';

export const KHR_PER_USD = 4100; // Standard exchange rate in Cambodia

export const RESIDENTIAL_TARIFFS: EDCSlab[] = [
  {
    minKwh: 0,
    maxKwh: 10,
    rateKhr: 380,
    descriptionKh: "រហូតដល់ ១០ គីឡូវ៉ាត់ម៉ោង (តម្រូវការទាបបំផុត)",
    descriptionEn: "Up to 10 kWh (Lifeline - very low usage)",
  },
  {
    minKwh: 11,
    maxKwh: 50,
    rateKhr: 480,
    descriptionKh: "ពី ១១ ដល់ ៥០ គីឡូវ៉ាត់ម៉ោង (តម្រូវការទាប)",
    descriptionEn: "11 to 50 kWh (Low usage - rooms/small apartments)",
  },
  {
    minKwh: 51,
    maxKwh: 200,
    rateKhr: 610,
    descriptionKh: "ពី ៥១ ដល់ ២០០ គីឡូវ៉ាត់ម៉ោង (តម្រូវការមធ្យម)",
    descriptionEn: "51 to 200 kWh (Medium usage - standard family homes)",
  },
  {
    minKwh: 201,
    maxKwh: Infinity,
    rateKhr: 730,
    descriptionKh: "លើសពី ២០០ គីឡូវ៉ាត់ម៉ោង (តម្រូវការខ្ពស់)",
    descriptionEn: "Above 200 kWh (High usage - houses with multiple ACs)",
  },
];

export const COMMERCIAL_TARIFF_RATE = 740; // Flat KHR per kWh for small shops, schools, and offices

/**
 * Calculates progressive EDC bill in KHR.
 * @param monthlyKwh total monthly usage in kWh
 * @param isCommercial whether to use the flat commercial rate
 */
export function calculateEdcCost(monthlyKwh: number, isCommercial: boolean = false): {
  totalKhr: number;
  totalUsd: number;
  breakdown: Array<{
    slab: string;
    kwhInSlab: number;
    rate: number;
    costKhr: number;
  }>;
} {
  if (isCommercial) {
    const totalKhr = Math.round(monthlyKwh * COMMERCIAL_TARIFF_RATE);
    return {
      totalKhr,
      totalUsd: Number((totalKhr / KHR_PER_USD).toFixed(2)),
      breakdown: [
        {
          slab: "Commercial/Business Flat Rate",
          kwhInSlab: monthlyKwh,
          rate: COMMERCIAL_TARIFF_RATE,
          costKhr: totalKhr,
        }
      ]
    };
  }

  // Progressive calculation (Block tariff)
  let remainingKwh = monthlyKwh;
  let totalKhr = 0;
  const breakdown: any[] = [];

  for (const slab of RESIDENTIAL_TARIFFS) {
    if (remainingKwh <= 0) break;

    const slabRange = slab.maxKwh - slab.minKwh + 1;
    const kwhInSlab = Math.min(remainingKwh, slabRange === Infinity ? remainingKwh : slabRange);
    const cost = Math.round(kwhInSlab * slab.rateKhr);

    totalKhr += cost;
    remainingKwh -= kwhInSlab;

    breakdown.push({
      slab: `${slab.minKwh}-${slab.maxKwh === Infinity ? '+' : slab.maxKwh} kWh`,
      kwhInSlab,
      rate: slab.rateKhr,
      costKhr: cost,
    });
  }

  return {
    totalKhr,
    totalUsd: Number((totalKhr / KHR_PER_USD).toFixed(2)),
    breakdown,
  };
}

/**
 * Format currency helper
 */
export function formatKhr(amount: number): string {
  return `${amount.toLocaleString('en-US')} ៛`;
}

export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
