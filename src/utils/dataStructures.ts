/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Device, HouseNode, GraphNode, GraphEdge } from '../types';

// ==========================================
// 1. CUSTOM HASH TABLE (Separate Chaining)
// ==========================================
export class CustomHashTable {
  private size: number;
  private buckets: Array<HashTableBucketNode | null>;
  private collisionCount: number = 0;

  constructor(size: number = 8) {
    this.size = size;
    this.buckets = new Array(size).fill(null);
  }

  // DJB2 Hash Algorithm (Educational & efficient)
  public hash(key: string): number {
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 33) ^ key.charCodeAt(i);
    }
    return Math.abs(hash) % this.size;
  }

  public insert(key: string, value: Device): { hashCode: number; index: number; collision: boolean } {
    const hashCode = this.hash(key);
    const index = hashCode;
    const newNode = new HashTableBucketNode(key, value, hashCode);

    let collision = false;
    if (this.buckets[index] === null) {
      this.buckets[index] = newNode;
    } else {
      collision = true;
      this.collisionCount++;
      // Traverse to the end of the chain (separate chaining)
      let current = this.buckets[index];
      while (current !== null) {
        if (current.key === key) {
          // Key already exists, update value
          current.value = value;
          return { hashCode, index, collision: false };
        }
        if (current.next === null) {
          current.next = newNode;
          break;
        }
        current = current.next;
      }
    }

    return { hashCode, index, collision };
  }

  public search(key: string): { device: Device | null; steps: Array<{ step: string; index: number }> } {
    const steps: Array<{ step: string; index: number }> = [];
    const hashCode = this.hash(key);
    const index = hashCode;

    steps.push({
      step: `Hash code calculated for "${key}": ${hashCode} (Index in table: ${index})`,
      index,
    });

    let current = this.buckets[index];
    let chainPosition = 0;

    while (current !== null) {
      steps.push({
        step: `Checking bucket index ${index}, chain position ${chainPosition}: Key is "${current.key}"`,
        index,
      });

      if (current.key.toLowerCase() === key.toLowerCase() || current.value.id === key) {
        steps.push({
          step: `SUCCESS: Key found at index ${index} (Chain position: ${chainPosition})`,
          index,
        });
        return { device: current.value, steps };
      }

      current = current.next;
      chainPosition++;
    }

    steps.push({
      step: `FAILED: Key "${key}" not found in bucket index ${index}`,
      index,
    });

    return { device: null, steps };
  }

  public getBucketsData() {
    return this.buckets.map((head, index) => {
      const chain: Array<{ key: string; deviceName: string; room: string; power: number }> = [];
      let current = head;
      while (current !== null) {
        chain.push({
          key: current.key,
          deviceName: current.value.name,
          room: current.value.roomName,
          power: current.value.powerWatts,
        });
        current = current.next;
      }
      return { index, chain };
    });
  }

  public getCollisionCount(): number {
    return this.collisionCount;
  }

  public clear(): void {
    this.buckets = new Array(this.size).fill(null);
    this.collisionCount = 0;
  }
}

class HashTableBucketNode {
  key: string;
  value: Device;
  hashCode: number;
  next: HashTableBucketNode | null = null;

  constructor(key: string, value: Device, hashCode: number) {
    this.key = key;
    this.value = value;
    this.hashCode = hashCode;
  }
}


// ==========================================
// 2. TREE STRUCTURE (House Hierarchy)
// ==========================================
export class HouseTree {
  public root: HouseNode;

  constructor(houseName: string = "ផ្ទះរបស់ខ្ញុំ") {
    this.root = {
      id: "root",
      name: houseName,
      type: 'house',
      children: [],
    };
  }

  // Build tree dynamically from device list
  public buildFromDevices(devices: Device[]): void {
    this.root.children = [];

    // Group rooms and insert
    const roomsMap = new Map<string, Device[]>();
    devices.forEach(d => {
      if (!roomsMap.has(d.roomName)) {
        roomsMap.set(d.roomName, []);
      }
      roomsMap.get(d.roomName)!.push(d);
    });

    roomsMap.forEach((roomDevices, roomName) => {
      const roomNode: HouseNode = {
        id: `room-${roomName.replace(/\s+/g, '-').toLowerCase()}`,
        name: roomName,
        type: 'room',
        parentId: 'root',
        children: [],
      };

      roomDevices.forEach(device => {
        const deviceNode: HouseNode = {
          id: `device-${device.id}`,
          name: device.name,
          type: 'device',
          powerWatts: device.powerWatts,
          parentId: roomNode.id,
          children: [],
        };
        roomNode.children.push(deviceNode);
      });

      this.root.children.push(roomNode);
    });
  }

  // Post-order traversal to calculate total power of any node
  public calculateTotalPower(node: HouseNode): number {
    if (node.type === 'device') {
      return node.powerWatts || 0;
    }

    let total = 0;
    for (const child of node.children) {
      total += this.calculateTotalPower(child);
    }
    return total;
  }

  // Search node by id (DFS)
  public findNode(id: string, node: HouseNode = this.root): HouseNode | null {
    if (node.id === id) return node;

    for (const child of node.children) {
      const found = this.findNode(id, child);
      if (found) return found;
    }
    return null;
  }
}


// ==========================================
// 3. GRAPH STRUCTURE (Energy Flow & Room Co-usage)
// ==========================================
export class EnergyGraph {
  public nodes: GraphNode[] = [];
  public edges: GraphEdge[] = [];

  // Construct energy correlation graph
  public buildGraph(devices: Device[], logs: any[] = []): void {
    this.nodes = [];
    this.edges = [];

    // Get unique rooms and total energy per room
    const roomEnergy: Record<string, number> = {};
    const roomDevices: Record<string, Device[]> = {};
    let totalHomeEnergy = 0;

    devices.forEach(d => {
      const kwh = (d.powerWatts * d.usageHours) / 1000;
      roomEnergy[d.roomName] = (roomEnergy[d.roomName] || 0) + kwh;
      totalHomeEnergy += kwh;

      if (!roomDevices[d.roomName]) {
        roomDevices[d.roomName] = [];
      }
      roomDevices[d.roomName].push(d);
    });

    // Node 1: Main Grid / Total House node
    this.nodes.push({
      id: 'grid-source',
      label: 'ម៉ែត្រអគ្គិសនី EDC',
      type: 'system',
      energyKwh: totalHomeEnergy,
    });

    // Add room nodes
    Object.keys(roomEnergy).forEach((roomName) => {
      const roomId = `gnode-room-${roomName.replace(/\s+/g, '-').toLowerCase()}`;
      this.nodes.push({
        id: roomId,
        label: roomName,
        type: 'room',
        energyKwh: roomEnergy[roomName],
      });

      // Connect EDC Meter to each Room
      this.edges.push({
        source: 'grid-source',
        target: roomId,
        weight: totalHomeEnergy > 0 ? (roomEnergy[roomName] / totalHomeEnergy) * 100 : 0,
        label: `${roomEnergy[roomName].toFixed(2)} kWh`,
      });

      // Add high-consuming device nodes for each room to represent the connections
      // To keep visual clutter low, only show top 2 devices or devices > 50W
      roomDevices[roomName]
        .sort((a, b) => b.powerWatts * b.usageHours - a.powerWatts * a.usageHours)
        .forEach((device) => {
          const deviceId = `gnode-dev-${device.id}`;
          const devKwh = (device.powerWatts * device.usageHours) / 1000;

          this.nodes.push({
            id: deviceId,
            label: device.name,
            type: 'device',
            energyKwh: devKwh,
          });

          // Connect Room to Device
          this.edges.push({
            source: roomId,
            target: deviceId,
            weight: roomEnergy[roomName] > 0 ? (devKwh / roomEnergy[roomName]) * 100 : 0,
            label: `${devKwh.toFixed(2)} kWh`,
          });
        });
    });

    // Set layout coordinates (Circle or layered force structure)
    this.calculateLayout();
  }

  // Assign clean layout positions for an elegant visual SVG network diagram
  private calculateLayout(): void {
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position source in the center
    const sourceNode = this.nodes.find(n => n.id === 'grid-source');
    if (sourceNode) {
      sourceNode.x = centerX;
      sourceNode.y = centerY;
    }

    // Position rooms in an inner circle
    const roomNodes = this.nodes.filter(n => n.type === 'room');
    const roomCount = roomNodes.length;
    const roomRadius = 120;

    roomNodes.forEach((node, index) => {
      const angle = (index / roomCount) * 2 * Math.PI - Math.PI / 2;
      node.x = centerX + roomRadius * Math.cos(angle);
      node.y = centerY + roomRadius * Math.sin(angle);

      // Position devices connected to this room in an outer cluster
      const roomDevices = this.nodes.filter(
        d => d.type === 'device' && this.edges.some(e => e.source === node.id && e.target === d.id)
      );
      const devCount = roomDevices.length;
      const devRadius = 80;

      roomDevices.forEach((devNode, devIndex) => {
        // Distribute devices around the room's angle
        const devSpread = Math.PI / 3; // spread angle
        const startAngle = angle - devSpread / 2;
        const devAngle = startAngle + (devCount > 1 ? (devIndex / (devCount - 1)) * devSpread : devSpread / 2);

        devNode.x = node.x! + devRadius * Math.cos(devAngle);
        devNode.y = node.y! + devRadius * Math.sin(devAngle);
      });
    });
  }
}
