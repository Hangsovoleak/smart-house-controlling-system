/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Device } from './types';

export const INITIAL_DEVICES: Device[] = [
  {
    id: "1",
    name: "ម៉ាស៊ីនត្រជាក់ (AC)",
    powerWatts: 1200,
    roomName: "បន្ទប់គេង",
    category: "cooling",
    usageHours: 6,
    isActive: true,
  },
  {
    id: "2",
    name: "កង្ហារអគ្គិសនី",
    powerWatts: 60,
    roomName: "បន្ទប់គេង",
    category: "cooling",
    usageHours: 8,
    isActive: true,
  },
  {
    id: "3",
    name: "ទូរទស្សន៍ឆ្លាតវៃ (TV)",
    powerWatts: 100,
    roomName: "បន្ទប់ទទួលភ្ញៀវ",
    category: "entertainment",
    usageHours: 4,
    isActive: true,
  },
  {
    id: "4",
    name: "ទូទឹកកកធម្មតា",
    powerWatts: 150,
    roomName: "ផ្ទះបាយ",
    category: "kitchen",
    usageHours: 24, // Runs continuously
    isActive: true,
  },
  {
    id: "5",
    name: "ឆ្នាំងបាយអគ្គិសនី",
    powerWatts: 600,
    roomName: "ផ្ទះបាយ",
    category: "kitchen",
    usageHours: 1, // Typically used 1 hr total per day
    isActive: true,
  },
  {
    id: "6",
    name: "អំពូលភ្លើងពិដាន LED",
    powerWatts: 30, // 3 bulbs of 10W each
    roomName: "បន្ទប់ទទួលភ្ញៀវ",
    category: "lighting",
    usageHours: 5,
    isActive: true,
  },
  {
    id: "7",
    name: "អំពូលម៉ែត្រ LED",
    powerWatts: 18,
    roomName: "បន្ទប់គេង",
    category: "lighting",
    usageHours: 4,
    isActive: true,
  },
  {
    id: "8",
    name: "ម៉ាស៊ីនបូមទឹក",
    powerWatts: 750,
    roomName: "កន្លែងប្រើប្រាស់ទូទៅ",
    category: "utilities",
    usageHours: 0.5, // Intermittent
    isActive: true,
  },
];

export const CAMBODIA_ENERGY_TIPS = [
  {
    title: "ការកំណត់សន្សំសំចៃម៉ាស៊ីនត្រជាក់",
    tip: "កំណត់សីតុណ្ហភាពម៉ាស៊ីនត្រជាក់ត្រឹម ២៥°C ឬ ២៦°C ជំនួសឱ្យ ១៨°C។ ក្នុងអាកាសធាតុក្តៅរបស់ប្រទេសកម្ពុជា រាល់ការបង្កើនសីតុណ្ហភាពមួយដឺក្រេ អាចជួយសន្សំសំចៃអគ្គិសនីបានប្រហែល ៧% ទៅ ១០%។",
    category: "cooling",
    impact: "សន្សំសំចៃខ្ពស់"
  },
  {
    title: "ការដកដោតឆ្នាំងបាយអគ្គិសនី",
    tip: "សូមដកដោតឆ្នាំងបាយអគ្គិសនីភ្លាម បន្ទាប់ពីបាយឆ្អិន។ ការទុកវាក្នុងរបៀប 'រក្សាកម្ដៅ' (Keep Warm) រាប់ម៉ោង អាចស៊ីភ្លើងស្ទើរតែស្មើនឹងការដាំបាយថ្មីមួយឆ្នាំងដែរ!",
    category: "kitchen",
    impact: "សន្សំសំចៃមធ្យម"
  },
  {
    title: "ប្តូរទៅប្រើអំពូល LED",
    tip: "ជំនួសអំពូលម៉ែត្រចាស់ៗមកប្រើអំពូល LED វិញ។ អំពូល LED នៅកម្ពុជាប្រើប្រាស់ថាមពលតិចជាង ៥០% ទៅ ៨០% និងមានអាយុកាលប្រើប្រាស់បានយូរជាង ទោះបីជាមានការប្រែប្រួលវ៉ុលអគ្គិសនីក៏ដោយ។",
    category: "lighting",
    impact: "សន្សំសំចៃខ្ពស់"
  },
  {
    title: "រៀបចំទុកដាក់ក្នុងទូទឹកកកឱ្យមានរបៀប",
    tip: "រក្សាទុកអាហារក្នុងទូទឹកកកប្រហែល ៧០% ទៅ ៨០% នៃចំណុះ។ ប្រសិនបើវាណែនពេក ខ្យល់ត្រជាក់មិនអាចចរាចរបានល្អឡើយ ចំណែកឯទូទឹកកកទទេស្អាតពេក ធ្វើឱ្យខ្យល់ត្រជាក់ឆាប់ភាយចេញរាល់ពេលបើកទ្វារ។",
    category: "kitchen",
    impact: "សន្សំសំចៃទាប"
  },
  {
    title: "សម្អាតធូលីពីកង្ហារ",
    tip: "ជូតសម្អាតស្លាបកង្ហារ និងគម្របម៉ូទ័រឱ្យបានទៀងទាត់។ កំណកធូលីបង្កើតកម្លាំងកកិត រុញច្រានឱ្យម៉ូទ័រដើរធ្ងន់ និងទាញយកថាមពលវ៉ាត់ច្រើនជាងមុន ដើម្បីបង្វិលក្នុងល្បឿនដដែល។",
    category: "cooling",
    impact: "សន្សំសំចៃទាប"
  }
];
