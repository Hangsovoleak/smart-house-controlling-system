/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Device {
  id: string;
  name: string;
  powerWatts: number; // e.g. 1200W for AC
  roomName: string;   // e.g. Bedroom
  category: DeviceCategory;
  usageHours: number; // Simulated hours per day
  isActive: boolean;
}

export type DeviceCategory = 
  | 'cooling'       // Air Conditioner, Fan
  | 'kitchen'       // Rice Cooker, Fridge, Kettle, Microwave
  | 'entertainment' // TV, Console, Sound system
  | 'lighting'      // LED bulb, Tube light
  | 'utilities'     // Water Pump, Washing machine, Iron
  | 'other';        // Laptop, Chargers

export interface HouseNode {
  id: string;
  name: string;
  type: 'house' | 'floor' | 'room' | 'device';
  powerWatts?: number; // Only for devices
  children: HouseNode[];
  parentId?: string;
}

export interface EnergyUsageLog {
  id: string;
  date: string;       // YYYY-MM-DD
  deviceId: string;
  deviceName: string;
  roomName: string;
  usageHours: number;
  kwhUsed: number;
  costKhr: number;
  costUsd: number;
}

export interface EDCSlab {
  minKwh: number;
  maxKwh: number;
  rateKhr: number;
  descriptionKh: string;
  descriptionEn: string;
}

export interface HashTableEntry {
  key: string;
  value: Device;
  hashCode: number;
  next: HashTableEntry | null; // For separate chaining visualization
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'room' | 'device' | 'system';
  energyKwh: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // Represents percentage of total energy or intensity
  label?: string;
}

export interface EnergyStats {
  totalKwh: number;
  totalCostKhr: number;
  totalCostUsd: number;
  averageHoursPerDevice: number;
  highestConsumingDevice: string;
  highestConsumingRoom: string;
}
