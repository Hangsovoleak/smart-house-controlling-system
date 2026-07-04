/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Home, 
  PlusCircle, 
  Network, 
  GitMerge, 
  BarChart3, 
  FileText, 
  TrendingUp, 
  Search, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight, 
  Printer, 
  RefreshCw, 
  DollarSign, 
  Clock, 
  Info,
  Layers,
  Leaf,
  CheckCircle,
  Building,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

import { Device, DeviceCategory, HouseNode, EnergyStats } from './types';
import { CustomHashTable, HouseTree, EnergyGraph } from './utils/dataStructures';
import { calculateEdcCost, formatKhr, formatUsd, KHR_PER_USD, RESIDENTIAL_TARIFFS, COMMERCIAL_TARIFF_RATE } from './utils/edcTariff';
import { INITIAL_DEVICES, CAMBODIA_ENERGY_TIPS } from './data';
import DataEntry from './components/DataEntry';

export default function App() {
  // --- STATE ---
  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('khmer_energy_devices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_DEVICES;
      }
    }
    return INITIAL_DEVICES;
  });

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'add' | 'tree' | 'graph' | 'analytics' | 'report'>('dashboard');
  const [isCommercial, setIsCommercial] = useState<boolean>(false);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
  
  // Hash Table visualizer states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hashSearchResult, setHashSearchResult] = useState<Device | null>(null);
  const [hashSearchSteps, setHashSearchSteps] = useState<Array<{ step: string; index: number }>>([]);
  const [searchedKey, setSearchedKey] = useState<string>('');
  const [searchCompleted, setSearchCompleted] = useState<boolean>(false);

  // Tree view expanded rooms
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({
    'room-bedroom': true,
    'room-kitchen': true,
    'room-living-room': true,
    'room-utilities': true,
    'room-បន្ទប់គេង': true,
    'room-បន្ទប់ទទួលភ្ញៀវ': true,
    'room-ផ្ទះបាយ': true,
    'room-កន្លែងប្រើប្រាស់ទូទៅ': true
  });

  // Graph interaction state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Auto-slide tip carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % CAMBODIA_ENERGY_TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Sync devices with localStorage
  useEffect(() => {
    localStorage.setItem('khmer_energy_devices', JSON.stringify(devices));
  }, [devices]);

  // --- DEVICE MUTATIONS ---
  const handleAddDevice = (newDevice: Omit<Device, 'id'>) => {
    const deviceWithId: Device = {
      ...newDevice,
      id: Math.random().toString(36).substr(2, 9),
    };
    setDevices(prev => [...prev, deviceWithId]);
  };

  const handleUpdateDevice = (updated: Device) => {
    setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
  };

  const handleDeleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };

  const handleResetToDefault = () => {
    if (confirm("តើអ្នកពិតជាចង់កំណត់ទិន្នន័យឧបករណ៍ទាំងអស់ឡើងវិញមែនទេ?")) {
      setDevices(INITIAL_DEVICES);
      localStorage.removeItem('khmer_energy_devices');
    }
  };

  // --- DATA STRUCTURE INSTANCES & CALCULATIONS ---

  // 1. Hash Table build
  const hashTable = useMemo(() => {
    const table = new CustomHashTable(8);
    devices.forEach(d => {
      table.insert(d.name.toLowerCase(), d);
    });
    return table;
  }, [devices]);

  // 2. Tree hierarchy build
  const houseTree = useMemo(() => {
    const tree = new HouseTree("ផ្ទះរបស់ខ្ញុំ");
    tree.buildFromDevices(devices);
    return tree;
  }, [devices]);

  // 3. Network Graph build
  const energyGraph = useMemo(() => {
    const graph = new EnergyGraph();
    graph.buildGraph(devices.filter(d => d.isActive));
    return graph;
  }, [devices]);

  // Global calculations
  const stats = useMemo<EnergyStats>(() => {
    let totalKwh = 0;
    let totalWattsActive = 0;
    let activeCount = 0;
    let totalHours = 0;
    
    const roomConsumption: Record<string, number> = {};
    let highestDeviceName = 'គ្មាន';
    let maxDeviceKwh = 0;

    devices.forEach(d => {
      if (d.isActive) {
        const kwh = (d.powerWatts * d.usageHours) / 1000;
        totalKwh += kwh;
        totalWattsActive += d.powerWatts;
        activeCount++;
        totalHours += d.usageHours;

        roomConsumption[d.roomName] = (roomConsumption[d.roomName] || 0) + kwh;

        if (kwh > maxDeviceKwh) {
          maxDeviceKwh = kwh;
          highestDeviceName = d.name;
        }
      }
    });

    // Find highest consuming room
    let highestRoomName = 'គ្មាន';
    let maxRoomKwh = 0;
    Object.keys(roomConsumption).forEach(room => {
      if (roomConsumption[room] > maxRoomKwh) {
        maxRoomKwh = roomConsumption[room];
        highestRoomName = room;
      }
    });

    // Calculate progressive monthly EDC cost based on 30-day extrapolation
    const monthlyKwh = totalKwh * 30;
    const edcCost = calculateEdcCost(monthlyKwh, isCommercial);

    return {
      totalKwh: Number(totalKwh.toFixed(3)),
      totalCostKhr: edcCost.totalKhr,
      totalCostUsd: edcCost.totalUsd,
      averageHoursPerDevice: activeCount > 0 ? Number((totalHours / activeCount).toFixed(1)) : 0,
      highestConsumingDevice: highestDeviceName,
      highestConsumingRoom: highestRoomName,
    };
  }, [devices, isCommercial]);

  // Extrapolated Monthly variables
  const monthlyKwh = stats.totalKwh * 30;
  const edcBill = calculateEdcCost(monthlyKwh, isCommercial);

  // Hash Table search implementation
  const handleHashSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearchedKey(searchQuery);
    const { device, steps } = hashTable.search(searchQuery.trim().toLowerCase());
    setHashSearchResult(device);
    setHashSearchSteps(steps);
    setSearchCompleted(true);
  };

  const handleQuickSearch = (name: string) => {
    setSearchQuery(name);
    setSearchedKey(name);
    const { device, steps } = hashTable.search(name.toLowerCase());
    setHashSearchResult(device);
    setHashSearchSteps(steps);
    setSearchCompleted(true);
  };

  // Recharts formatted data
  const deviceChartData = useMemo(() => {
    return devices
      .filter(d => d.isActive)
      .map(d => ({
        name: d.name,
        kwh: Number(((d.powerWatts * d.usageHours) / 1000).toFixed(2)),
        watts: d.powerWatts,
        room: d.roomName
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [devices]);

  const categoryChartData = useMemo(() => {
    const cats: Record<string, number> = {};
    devices.filter(d => d.isActive).forEach(d => {
      const kwh = (d.powerWatts * d.usageHours) / 1000;
      cats[d.category] = (cats[d.category] || 0) + kwh;
    });

    return Object.keys(cats).map(key => {
      let labelKh = 'ផ្សេងៗ';
      if (key === 'cooling') labelKh = 'ប្រព័ន្ធត្រជាក់';
      else if (key === 'kitchen') labelKh = 'ផ្ទះបាយ';
      else if (key === 'entertainment') labelKh = 'កម្សាន្ត';
      else if (key === 'lighting') labelKh = 'អំពូលភ្លើង';
      else if (key === 'utilities') labelKh = 'ម៉ាស៊ីនបូមទឹក/ឧបករណ៍';

      return {
        name: labelKh,
        value: Number(cats[key].toFixed(2))
      };
    });
  }, [devices]);

  const COLORS = ['#14305f', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

  return (
    <div className="min-h-screen bg-[#d6fec2] text-slate-800 font-sans antialiased flex flex-col pb-12">
      
      {/* HEADER BANNER - Deep Cambodian Blue #14305f with Soft Green accent */}
      <header className="bg-[#14305f] text-white py-6 px-4 md:px-8 shadow-md border-b-4 border-emerald-400 no-print">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-inner">
              <Zap size={28} className="fill-current text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-300 font-semibold font-display">ប្រទេសកម្ពុជា • CAMBODIA</span>
              </div>
              <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white mt-1">
                ប្រព័ន្ធតាមដានការប្រើប្រាស់អគ្គិសនី
              </h1>
              <p className="text-xs text-slate-300 mt-0.5 font-sans">
                តាមដានការប្រើប្រាស់អគ្គិសនីក្នុងគេហដ្ឋាន បន្ទប់ជួល និងអាជីវកម្មខ្នាតតូច ស្របតាមពន្ធគណនារបស់ អគ្គិសនីកម្ពុជា (EDC)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3 transition-all text-xs font-medium">
              <span className="text-slate-300">ប្រភេទពន្ធអគ្គិសនី (EDC):</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCommercial(false)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${!isCommercial ? 'bg-emerald-500 text-white font-bold' : 'text-slate-200'}`}
                >
                  លំនៅឋាន
                </button>
                <button
                  onClick={() => setIsCommercial(true)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${isCommercial ? 'bg-emerald-500 text-white font-bold' : 'text-slate-200'}`}
                >
                  អាជីវកម្ម
                </button>
              </div>
            </div>

            <button
              onClick={handleResetToDefault}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="កំណត់ឡើងវិញ"
            >
              <RefreshCw size={13} />
              កំណត់ឡើងវិញ
            </button>
          </div>
        </div>
      </header>

      {/* CORE NAVIGATION BAR */}
      <nav className="bg-white border-b border-slate-150 py-3 px-4 md:px-8 shadow-xs sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto flex overflow-x-auto gap-2 py-1 scrollbar-none">
          <button
            onClick={() => setSelectedTab('dashboard')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'dashboard' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Home size={16} />
            ទំព័រដើម
          </button>

          <button
            onClick={() => setSelectedTab('add')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'add' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <PlusCircle size={16} />
            បញ្ចូលឧបករណ៍
          </button>

          <button
            onClick={() => setSelectedTab('tree')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'tree' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Layers size={16} />
            រចនាសម្ព័ន្ធផ្ទះ
          </button>

          <button
            onClick={() => setSelectedTab('graph')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'graph' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <Network size={16} />
            ក្រាហ្វទំនាក់ទំនង
          </button>

          <button
            onClick={() => setSelectedTab('analytics')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'analytics' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <BarChart3 size={16} />
            ការវិភាគគំនូសតាង
          </button>

          <button
            onClick={() => setSelectedTab('report')}
            className={`px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedTab === 'report' 
                ? 'bg-[#14305f] text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            <FileText size={16} />
            របាយការណ៍ប្រចាំខែ
          </button>
        </div>
      </nav>

      {/* BODY CONTENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 flex-1 w-full">
        
        {/* TAB 1: HOME DASHBOARD */}
        {selectedTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* HERO BANNER & REAL-TIME CAMBODIAN INSIGHT CAROUSEL */}
            <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl -z-0"></div>
              
              <div className="flex-1 space-y-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-[#14305f] rounded-md font-mono text-[10px] font-bold">ព័ត៌មានអគ្គិសនីកម្ពុជា</span>
                  <span className="text-xs text-slate-500">តម្លៃ និងគន្លឹះសន្សំសំចៃអគ្គិសនីប្រចាំថ្ងៃ</span>
                </div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-slate-950 leading-tight">
                  សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងអគ្គិសនី <br />
                  <span className="text-[#14305f] font-sans font-medium text-base md:text-lg">តាមដាន និងវិភាគការប្រើប្រាស់ថាមពលក្នុងផ្ទះរបស់អ្នក</span>
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  ការប្រើប្រាស់អគ្គិសនីនៅប្រទេសកម្ពុជាត្រូវបានគណនាតាមកម្រិតវ៉ុល និងបរិមាណប្រើប្រាស់ផ្សេងៗគ្នា។ ប្រព័ន្ធនេះជួយសម្រួលដល់ការគណនាថ្លៃដើមតាមដារីហ្វផ្លូវការរបស់អគ្គិសនីកម្ពុជា (EDC) ដើម្បីឱ្យលោកអ្នកអាចកែសម្រួលទម្លាប់ និងកាត់បន្ថយការចំណាយបានយ៉ាងមានប្រសិទ្ធភាព។
                </p>

                {/* Quick Actions Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button 
                    onClick={() => setSelectedTab('add')}
                    className="px-4 py-2.5 bg-[#14305f] hover:bg-[#1b3a6d] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={14} />
                    បញ្ចូលការប្រើប្រាស់ឧបករណ៍
                  </button>
                  <button 
                    onClick={() => setSelectedTab('report')}
                    className="px-4 py-2.5 bg-[#14305f]/10 hover:bg-[#14305f]/20 text-[#14305f] text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText size={14} />
                    បង្ហាញរបាយការណ៍ប្រចាំខែ
                  </button>
                </div>
              </div>

              {/* SAVING ADVICE SLIDER CARD */}
              <div className="w-full md:w-96 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#14305f]">
                    <Sparkles size={16} className="text-emerald-600 fill-emerald-100" />
                    <span className="text-xs font-bold uppercase tracking-wider font-display">គន្លឹះសន្សំសំចៃអគ្គិសនី</span>
                  </div>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {CAMBODIA_ENERGY_TIPS[currentTipIndex].impact}
                  </span>
                </div>

                <div className="my-4">
                  <h4 className="text-sm font-semibold text-slate-800 mb-1">
                    {CAMBODIA_ENERGY_TIPS[currentTipIndex].title}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{CAMBODIA_ENERGY_TIPS[currentTipIndex].tip}"
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-emerald-100/50 pt-3">
                  <div className="flex gap-1">
                    {CAMBODIA_ENERGY_TIPS.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentTipIndex(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${currentTipIndex === idx ? 'w-4 bg-[#14305f]' : 'w-1.5 bg-slate-200'}`}
                        aria-label={`ស្លាយទី ${idx + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentTipIndex((currentTipIndex + 1) % CAMBODIA_ENERGY_TIPS.length)}
                    className="text-[11px] font-bold text-[#14305f] flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    គន្លឹះបន្ទាប់ <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* KEY METRICS BENTO GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Daily Energy Consumption */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                  <Zap size={22} className="fill-emerald-100 text-yellow-500" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">សរុបប្រចាំថ្ងៃ</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-mono font-bold text-slate-950">{stats.totalKwh}</span>
                    <span className="text-xs font-bold text-slate-500">kWh/ថ្ងៃ</span>
                  </div>
                  <p className="text-[10px] text-slate-500">គិតលើឧបករណ៍ដែលបានបើក</p>
                </div>
              </div>

              {/* Monthly Estimated Bill */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-[#14305f]">
                  <DollarSign size={22} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">ការប៉ាន់ស្មានតម្លៃប្រចាំខែ</span>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-slate-950 leading-tight">{formatKhr(stats.totalCostKhr)}</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">{formatUsd(stats.totalCostUsd)} USD</span>
                  </div>
                  <p className="text-[10px] text-slate-500">គណនាតាមរូបមន្តកើនឡើងទ្វេដង (៣០ថ្ងៃ)</p>
                </div>
              </div>

              {/* Highest Consuming Device */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <AlertCircle size={22} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">ឧបករណ៍ប្រើច្រើនជាងគេ</span>
                  <span className="text-sm font-bold text-slate-900 block truncate max-w-[150px]">
                    {stats.highestConsumingDevice}
                  </span>
                  <p className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1">
                    <span>ប្រើប្រាស់ថាមពលខ្ពស់ជាងគេ</span>
                  </p>
                </div>
              </div>

              {/* Highest Room */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                  <Layers size={22} />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">បន្ទប់ប្រើច្រើនជាងគេ</span>
                  <span className="text-sm font-bold text-slate-900 block truncate">
                    {stats.highestConsumingRoom}
                  </span>
                  <p className="text-[10px] text-purple-600 font-medium mt-1">
                    មានបន្ទុកប្រើប្រាស់ខ្ពស់ជាងគេ
                  </p>
                </div>
              </div>
            </div>

            {/* BLOCK TARIFF PROGRESS BAR VISUALIZER */}
            <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#14305f] uppercase tracking-wider flex items-center gap-1.5">
                    <Info size={16} /> តារាងពន្ធអគ្គិសនីកម្ពុជា (EDC Tariff)
                  </h3>
                  <p className="text-xs text-slate-500">ពិនិត្យមើលថាតើការប្រើប្រាស់ប្រចាំខែ {monthlyKwh.toFixed(1)} kWh/ខែ របស់អ្នកស្ថិតក្នុងក្រុមពន្ធកម្រិតណា។</p>
                </div>
                <span className="text-xs font-bold bg-[#14305f]/5 text-[#14305f] border border-[#14305f]/10 px-2.5 py-1 rounded-full">
                  អត្រាផ្លូវការ៖ អគ្គិសនីកម្ពុជា (EDC)
                </span>
              </div>

              {isCommercial ? (
                <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-4 flex items-center gap-3">
                  <Building className="text-amber-600 shrink-0" size={24} />
                  <div className="text-xs text-amber-900">
                    <span className="font-bold block text-sm">ពន្ធអាជីវកម្មអត្រាស្មើត្រូវបានបើក</span>
                    សម្រាប់អាជីវកម្មខ្នាតតូច បន្ទប់ជួល គ្រឹះស្ថានអប់រំ និងការិយាល័យ ត្រូវបានគិតថ្លៃរួមស្មើគឺ <strong className="font-mono">{COMMERCIAL_TARIFF_RATE} រៀល</strong> ក្នុងមួយគីឡូវ៉ាត់ម៉ោង (kWh) ដោយគ្មានការបែងចែកកម្រិតឡើយ។
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                  {RESIDENTIAL_TARIFFS.map((slab, index) => {
                    const isMinMatch = monthlyKwh >= slab.minKwh;
                    const isMaxMatch = monthlyKwh <= (slab.maxKwh === Infinity ? 999999 : slab.maxKwh);
                    const isCurrentSlab = isMinMatch && (slab.maxKwh === Infinity ? true : isMaxMatch);

                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isCurrentSlab 
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/20' 
                            : 'bg-slate-50/50 border-slate-150 opacity-75'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">កម្រិត {index + 1}</span>
                            {isCurrentSlab && (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                ក្រុមសកម្មបច្ចុប្បន្ន
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-bold text-slate-800 block font-mono">
                            {slab.minKwh} - {slab.maxKwh === Infinity ? 'ច្រើនជាង' : slab.maxKwh} kWh
                          </span>
                          <span className="text-xs text-slate-500 font-medium block">
                            {slab.descriptionKh}
                          </span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-150 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">អត្រាគិតថ្លៃ៖</span>
                          <span className="text-xs font-bold text-[#14305f] font-mono">
                            {slab.rateKhr} រៀល <span className="text-[10px] font-normal text-slate-400">/kWh</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DASHBOARD GRID: DEVICE INVENTORY SHORTCUTS & HASH SEARCH QUICK VIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* TOP ENERGY APPLIANCES VIEW */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-[#14305f] uppercase tracking-wider">
                        ចំណាត់ថ្នាក់ឧបករណ៍សកម្ម (Ranking)
                      </h3>
                      <p className="text-xs text-slate-500">តម្រៀបតាមកម្រិតការប្រើប្រាស់ថាមពលប្រចាំថ្ងៃខ្ពស់ជាងគេ</p>
                    </div>
                    <button 
                      onClick={() => setSelectedTab('analytics')}
                      className="text-xs font-bold text-[#14305f] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      ការវិភាគទាំងអស់ <ChevronRight size={14} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {deviceChartData.length > 0 ? (
                      deviceChartData.map((d, index) => {
                        const maxKwh = deviceChartData[0]?.kwh || 1;
                        const barPercentage = (d.kwh / maxKwh) * 100;
                        return (
                          <div key={index} className="space-y-1.5">
                            <div className="flex justify-between items-baseline text-xs">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#14305f] bg-slate-100 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                  {index + 1}
                                </span>
                                <span className="font-semibold text-slate-800">{d.name}</span>
                                <span className="text-[9px] text-slate-400 font-medium bg-slate-50 px-1.5 py-0.5 rounded-sm">
                                  {d.room}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-900">{d.kwh.toFixed(2)} kWh</span>
                                <span className="text-slate-400">/ថ្ងៃ</span>
                              </div>
                            </div>
                            {/* Bar visualizer */}
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-[#14305f] h-full rounded-full transition-all duration-500"
                                style={{ width: `${barPercentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        មិនទាន់មានឧបករណ៍ដែលកំពុងបើកដំណើរការឡើយ។ សូមកំណត់ដំណើរការឧបករណ៍ក្នុងទំព័របញ្ចូលឧបករណ៍!
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-2">
                  <span>កាបូនឌីអុកស៊ីតភាយចេញប៉ាន់ស្មាន៖ <strong>{(stats.totalKwh * 30 * 0.5).toFixed(1)} kg CO2</strong> /ខែ</span>
                  <span className="text-[10px] text-slate-400 italic">មេគុណបំភាយឧស្ម័ន៖ 0.5kg CO2 ក្នុងមួយគីឡូវ៉ាត់ម៉ោង</span>
                </div>
              </div>

              {/* EDUCATIONAL HASH TABLE INTEGRATION (QUICK SEARCH) */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-150 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold text-[#14305f] bg-[#14305f]/5 border border-[#14305f]/10 px-2 py-0.5 rounded-md uppercase tracking-wider font-display">
                      រចនាសម្ព័ន្ធទិន្នន័យ (Hash Table)
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                      <Search size={16} className="text-[#14305f]" /> ស្វែងរកឧបករណ៍ដោយប្រើសន្ទស្សន៍ហាស
                    </h3>
                    <p className="text-xs text-slate-500">ប្រព័ន្ធស្វែងរកដោយគណនាកូដ Hash DJB2 និងបំបែកការជាន់គ្នា (Collision Chaining)។</p>
                  </div>

                  {/* Hash search form */}
                  <form onSubmit={handleHashSearch} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ឧ. កង្ហារអគ្គិសនី, ទូទឹកកក"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#14305f]/10 focus:border-[#14305f] text-slate-850"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#14305f] hover:bg-[#1e4178] text-white text-xs font-semibold rounded-xl cursor-pointer"
                    >
                      ស្វែងរក
                    </button>
                  </form>

                  {/* Quick tags */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] text-slate-400 font-medium">ពាក្យគន្លឹះរហ័ស៖</span>
                    {devices.slice(0, 3).map(d => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleQuickSearch(d.name)}
                        className="text-[10px] px-2 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 hover:border-[#14305f] hover:text-[#14305f] transition-all cursor-pointer"
                      >
                        {d.name.split(' (')[0]}
                      </button>
                    ))}
                  </div>

                  {/* Search Result display */}
                  {searchCompleted && (
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3 transition-all">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">លទ្ធផលស្វែងរកសម្រាប់ "{searchedKey}"</span>
                        <button 
                          onClick={() => { setSearchCompleted(false); setSearchQuery(''); }}
                          className="text-[10px] font-semibold text-[#14305f] hover:underline"
                        >
                          សម្អាត
                        </button>
                      </div>

                      {hashSearchResult ? (
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Zap size={16} />
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-800 block">{hashSearchResult.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              ទីតាំង៖ {hashSearchResult.roomName} • កម្លាំងអគ្គិសនី៖ {hashSearchResult.powerWatts}W
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle size={14} /> រកមិនឃើញ! សូមពិនិត្យអក្ខរាវិរុទ្ធឡើងវិញ។
                        </div>
                      )}

                      {/* Display calculations */}
                      <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-150">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">គណនា Hash DJB2 និង Separate Chaining:</span>
                        <div className="space-y-1 max-h-[100px] overflow-y-auto font-mono text-[9px] text-slate-600">
                          {hashSearchSteps.map((step, sIdx) => (
                            <div key={sIdx} className="flex gap-1">
                              <span className="text-[#14305f] font-bold">[{sIdx + 1}]</span>
                              <span>{step.step.replace("Hash code calculated for", "លេខកូដ Hash សម្រាប់").replace("Index in table", "លិបិក្រម").replace("Checking bucket index", "កំពុងត្រួតពិនិត្យប្រឡោះទី").replace("SUCCESS: Key found at index", "ជោគជ័យ៖ រកឃើញទិន្នន័យនៅលិបិក្រម").replace("FAILED: Key", "បរាជ័យ៖ ពាក្យគន្លឹះ").replace("not found in bucket index", "រកមិនឃើញឡើយ")}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                  <span>ដោះស្រាយបញ្ហាជាន់គ្នា៖ Chaining</span>
                  <span className="font-mono">ចំនួនករណីជាន់គ្នាបច្ចុប្បន្ន៖ {hashTable.getCollisionCount()}</span>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: DATA ENTRY MODULE */}
        {selectedTab === 'add' && (
          <div className="animate-fadeIn">
            <DataEntry 
              devices={devices}
              onAddDevice={handleAddDevice}
              onUpdateDevice={handleUpdateDevice}
              onDeleteDevice={handleDeleteDevice}
            />
          </div>
        )}

        {/* TAB 3: TREE VIEWS (HOUSE HIERARCHY) */}
        {selectedTab === 'tree' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-150 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
                    <Layers size={20} className="text-[#14305f]" /> រចនាសម្ព័ន្ធមែកធាងផ្ទះ (House Tree structure)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ប្លង់ចរន្តទិន្នន័យ៖ <strong>ផ្ទះ → បន្ទប់នានា → ឧបករណ៍អគ្គិសនី</strong>។ រៀបចំឡើងដោយគណនាផលបូកកម្លាំងវ៉ាត់តាមបន្ទប់នីមួយៗ។
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 text-slate-700 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
                  <span className="p-1 bg-emerald-500 rounded-sm text-white font-mono text-[9px]">DFS Tree</span>
                  <span>កម្មវិធីប្រើប្រាស់ក្បួនស្វែងរក Post-order DFS ដើម្បីបូកសរុបកម្លាំងវ៉ាត់ពីកូនៗ។</span>
                </div>
              </div>

              {/* Tree Diagram Rendering */}
              <div className="max-w-3xl mx-auto border border-slate-150 rounded-2xl bg-slate-50 p-6 shadow-inner">
                {/* House root */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2.5 bg-[#14305f] text-white p-4 rounded-xl shadow-xs">
                    <Home className="text-emerald-300" size={20} />
                    <div className="flex-1 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-sm tracking-wide block">{houseTree.root.name}</span>
                        <span className="text-[10px] text-slate-300">ឫសគល់ (Root Node)៖ គេហដ្ឋានទាំងមូល</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-white/15 px-3 py-1 rounded-md text-emerald-300">
                        សរុប៖ {devices.reduce((acc, d) => acc + (d.isActive ? d.powerWatts : 0), 0)} W
                      </span>
                    </div>
                  </div>

                  {/* Room Nodes */}
                  <div className="pl-6 border-l-2 border-dashed border-slate-300 space-y-4 pt-1">
                    {houseTree.root.children.map((roomNode) => {
                      const isExpanded = expandedRooms[roomNode.id] !== false;
                      const roomTotalPower = devices
                        .filter(d => d.roomName === roomNode.name && d.isActive)
                        .reduce((sum, current) => sum + current.powerWatts, 0);

                      return (
                        <div key={roomNode.id} className="space-y-2 relative">
                          {/* visual connector lines */}
                          <div className="absolute -left-6 top-4 w-6 h-0.5 border-t-2 border-dashed border-slate-300"></div>
                          
                          <div 
                            className="flex items-center justify-between bg-white border border-slate-150 hover:border-slate-200 p-3.5 rounded-xl shadow-2xs cursor-pointer transition-all"
                            onClick={() => setExpandedRooms(prev => ({ ...prev, [roomNode.id]: !isExpanded }))}
                          >
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                              <Layers size={14} className="text-[#14305f]" />
                              <div>
                                <span className="font-semibold text-xs md:text-sm text-slate-800 block">{roomNode.name}</span>
                                <span className="text-[10px] text-slate-400">បន្ទប់ • មានឧបករណ៍ចំនួន {roomNode.children.length}</span>
                              </div>
                            </div>
                            <span className="text-xs font-mono font-bold bg-slate-100 text-[#14305f] px-2.5 py-1 rounded-md">
                              កម្លាំងប្រើប្រាស់៖ {roomTotalPower} W
                            </span>
                          </div>

                          {/* Device Sub-Nodes */}
                          {isExpanded && (
                            <div className="pl-8 border-l-2 border-slate-200 space-y-2 pt-1 pb-2">
                              {roomNode.children.map((deviceNode) => {
                                const actualDevice = devices.find(d => d.id === deviceNode.id.replace('device-', ''));
                                const isActive = actualDevice?.isActive;
                                const deviceHours = actualDevice?.usageHours || 0;
                                const deviceKwh = actualDevice ? (actualDevice.powerWatts * actualDevice.usageHours) / 1000 : 0;

                                return (
                                  <div key={deviceNode.id} className="flex items-center justify-between bg-white/80 border border-slate-150 p-3 rounded-lg relative">
                                    <div className="absolute -left-8 top-5 w-8 h-0.5 border-t border-slate-200"></div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Sliders size={12} className="text-slate-400" />
                                      <div>
                                        <span className={`text-xs font-semibold ${isActive ? 'text-slate-700' : 'text-slate-400 line-through'}`}>
                                          {deviceNode.name}
                                        </span>
                                        <span className="text-[9px] text-slate-400 block">
                                          រយៈពេល៖ {deviceHours} ម៉ោង/ថ្ងៃ • កម្រិត៖ {deviceNode.powerWatts}W
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-semibold uppercase ${
                                        isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-450'
                                      }`}>
                                        {isActive ? 'កំពុងបើក' : 'បិទ'}
                                      </span>
                                      {isActive && (
                                        <span className="text-xs font-mono font-bold text-slate-600">
                                          {deviceKwh.toFixed(2)} kWh/ថ្ងៃ
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GRAPH VIEW (ENERGY FLOW RELATIONSHIPS) */}
        {selectedTab === 'graph' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-150 pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
                    <Network size={20} className="text-[#14305f]" /> គំនូសតាងទំនាក់ទំនង និងការចែកចាយថាមពល (Energy Graph)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ខ្សែតភ្ជាប់ដែលដិតក្រាស់តំណាងឱ្យចរន្តប្រើប្រាស់ខ្ពស់។ ចុចលើរង្វង់ដើម្បីពិនិត្យទិន្នន័យជាក់លាក់។
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-red-50 text-red-700 border border-red-100 px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                    ខ្សែតភ្ជាប់ខ្លាំង (ចាប់ពី ១ kWh/ថ្ងៃ)
                  </span>
                  <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1 font-semibold">
                    ខ្សែតភ្ជាប់ទាប
                  </span>
                </div>
              </div>

              {/* Dynamic SVG Graph Canvas */}
              <div className="max-w-3xl mx-auto border border-slate-150 rounded-2xl bg-slate-900 p-6 relative overflow-hidden flex flex-col justify-between" style={{ minHeight: '480px' }}>
                <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono">
                  D0_NOT_DELETE - SVG GRAPH VIEWER
                </div>

                <svg className="w-full h-[380px] select-none" viewBox="0 0 600 400">
                  <defs>
                    <radialGradient id="gridGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="highLoadGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Draw Edges (Links) */}
                  {energyGraph.edges.map((edge, index) => {
                    const sourceNode = energyGraph.nodes.find(n => n.id === edge.source);
                    const targetNode = energyGraph.nodes.find(n => n.id === edge.target);

                    if (!sourceNode || !targetNode) return null;

                    const x1 = sourceNode.x || 0;
                    const y1 = sourceNode.y || 0;
                    const x2 = targetNode.x || 0;
                    const y2 = targetNode.y || 0;

                    const isHighLoad = edge.label && parseFloat(edge.label) > 1.0;
                    const strokeColor = isHighLoad ? '#f97316' : '#10b981';
                    const strokeWidth = isHighLoad ? 3.5 : 1.5;

                    return (
                      <g key={index} className="transition-all duration-300">
                        {isHighLoad && (
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="#f97316"
                            strokeWidth={strokeWidth + 4}
                            strokeOpacity={0.2}
                            strokeLinecap="round"
                          />
                        )}
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeOpacity={hoveredNodeId && (hoveredNodeId !== edge.source && hoveredNodeId !== edge.target) ? 0.2 : 0.75}
                        />
                        {/* Display Edge weight label */}
                        {(hoveredNodeId === edge.source || hoveredNodeId === edge.target || !hoveredNodeId) && (
                          <g transform={`translate(${(x1 + x2) / 2}, ${(y1 + y2) / 2 - 4})`}>
                            <rect
                              x="-25"
                              y="-7"
                              width="50"
                              height="14"
                              rx="3"
                              fill="#0f172a"
                              stroke="#334155"
                              strokeWidth="0.5"
                            />
                            <text
                              fill="#94a3b8"
                              fontSize="8"
                              fontFamily="monospace"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                            >
                              {edge.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw Nodes */}
                  {energyGraph.nodes.map((node) => {
                    const cx = node.x || 0;
                    const cy = node.y || 0;

                    let nodeColor = '#38bdf8'; // room
                    let nodeRadius = 18;
                    let textLabel = node.label;

                    if (node.type === 'system') {
                      nodeColor = '#10b981'; // grid meter
                      nodeRadius = 24;
                    } else if (node.type === 'device') {
                      nodeColor = node.energyKwh > 1.0 ? '#ef4444' : '#64748b';
                      nodeRadius = 12;
                      textLabel = node.label.split(' (')[0];
                    }

                    const isHovered = hoveredNodeId === node.id;
                    const isSelected = selectedNodeId === node.id;

                    return (
                      <g 
                        key={node.id}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        onClick={() => setSelectedNodeId(node.id)}
                        className="cursor-pointer transition-all duration-300"
                      >
                        {node.type === 'system' && (
                          <circle cx={cx} cy={cy} r={34} fill="url(#gridGlow)" />
                        )}
                        {node.type === 'device' && node.energyKwh > 1.0 && (
                          <circle cx={cx} cy={cy} r={22} fill="url(#highLoadGlow)" />
                        )}

                        <circle
                          cx={cx}
                          cy={cy}
                          r={nodeRadius + (isHovered ? 3 : 0)}
                          fill={nodeColor}
                          stroke="#1e293b"
                          strokeWidth={isSelected ? 3 : 1.5}
                          className="transition-all duration-200"
                        />

                        {/* Node Label Text */}
                        <text
                          x={cx}
                          y={cy + nodeRadius + (isHovered ? 16 : 14)}
                          fill={isHovered ? '#ffffff' : '#94a3b8'}
                          fontSize={node.type === 'system' ? '10' : '8'}
                          textAnchor="middle"
                          className="transition-all"
                        >
                          {textLabel}
                        </text>

                        {/* Value Text printed inside or above nodes on hover */}
                        {isHovered && (
                          <g transform={`translate(${cx}, ${cy - nodeRadius - 15})`}>
                            <rect
                              x="-35"
                              y="-8"
                              width="70"
                              height="16"
                              rx="4"
                              fill="#1e293b"
                              stroke="#475569"
                            />
                            <text
                              fill="#f8fafc"
                              fontSize="8"
                              fontWeight="bold"
                              textAnchor="middle"
                              alignmentBaseline="middle"
                              y="1"
                            >
                              {node.energyKwh.toFixed(2)} kWh
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Legend & interactive panel */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] inline-block"></span>
                      <span>ប្រភពម៉ែត្រ EDC</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] inline-block"></span>
                      <span>បន្ទប់/ទីតាំង</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#ef4444] inline-block"></span>
                      <span>ឧបករណ៍ថាមពលខ្ពស់</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#64748b] inline-block"></span>
                      <span>ឧបករណ៍ទូទៅ</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    {selectedNodeId ? (
                      <span>
                        អ្នកបានជ្រើសរើស៖ <strong>{energyGraph.nodes.find(n => n.id === selectedNodeId)?.label}</strong> ({energyGraph.nodes.find(n => n.id === selectedNodeId)?.energyKwh.toFixed(2)} kWh/ថ្ងៃ)
                      </span>
                    ) : (
                      <span>អូសកណ្តុរពីលើរង្វង់ដើម្បីបង្ហាញតម្លៃអគ្គិសនីជាក់លាក់។</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CHARTS & STATS */}
        {selectedTab === 'analytics' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Device Consumption chart */}
              <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#14305f] uppercase tracking-wider">
                    គំនូសតាងការប្រើប្រាស់តាមឧបករណ៍ (គិតជា kWh/ថ្ងៃ)
                  </h3>
                  <p className="text-xs text-slate-500">ការគណនាបរិមាណថាមពលកម្រិតគីឡូវ៉ាត់ម៉ោងក្នុងមួយថ្ងៃ</p>
                </div>

                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} stroke="#cbd5e1" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                      <Tooltip 
                        contentStyle={{ fontSize: '11px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value) => [`${value} kWh`, 'កម្រិតប្រើប្រាស់']}
                      />
                      <Bar dataKey="kwh" fill="#14305f" radius={[4, 4, 0, 0]}>
                        {deviceChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Pie Chart */}
              <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-150 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#14305f] uppercase tracking-wider">
                    ចំណែកថាមពលតាមប្រភេទឧបករណ៍ (Shares)
                  </h3>
                  <p className="text-xs text-slate-500">ការបែងចែកភាគរយនៃការប្រើប្រាស់ថាមពល</p>
                </div>

                <div className="h-44 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} kWh`, 'បន្ទុកប្រើប្រាស់']} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="absolute text-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">បន្ទុកសរុប</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{stats.totalKwh} <span className="text-[11px]">kWh</span></span>
                  </div>
                </div>

                {/* Custom Category Legend */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-slate-600 border-t border-slate-150 pt-3">
                  {categoryChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="truncate">{entry.name} ({entry.value} kWh)</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* HIGH-LEVEL CO-USAGE OBSERVATION INSIGHTS CARD */}
            <div className="bg-white rounded-2xl p-6 border border-emerald-300 bg-[#f9fdf8] grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-amber-600 font-semibold text-xs uppercase tracking-wide">
                  <AlertCircle size={15} /> ចំនុចដែលស៊ីភ្លើងខ្លាំងជាងគេ
                </div>
                <h4 className="text-sm font-bold text-slate-800">ប្រព័ន្ធម៉ាស៊ីនត្រជាក់ និងកង្ហារ</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  នៅប្រទេសកម្ពុជា ម៉ាស៊ីនត្រជាក់គឺជាឧបករណ៍ស៊ីភ្លើងខ្លាំងជាងគេ។ ឧបករណ៍ AC របស់លោកអ្នកគិតជាមធ្យមស៊ីថាមពលរហូតដល់វ៉ាត់ខ្ពស់។ ដើម្បីកាត់បន្ថយការចំណាយមិនឱ្យហក់ចូលទៅកម្រិតទី៤ នៃតារាងពន្ធអគ្គិសនី EDC (៧៣០ រៀល/kWh) លោកអ្នកគួរប្រើប្រាស់កង្ហារជំនួសវិញនៅពេលសីតុណ្ហភាពខាងក្រៅសមស្រប។
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-dashed border-slate-200 md:pl-6">
                <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs uppercase tracking-wide">
                  <TrendingUp size={15} /> ការពិនិត្យបន្ទប់៖ {stats.highestConsumingRoom}
                </div>
                <h4 className="text-sm font-bold text-slate-800">ការវិភាគទីតាំងខ្ពស់បំផុត</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  បន្ទប់ <strong className="text-[#14305f]">{stats.highestConsumingRoom}</strong> ត្រូវបានវាស់វែងឃើញថាមានបន្ទុកស៊ីភ្លើងលេចធ្លោជាងគេ។ សូមធ្វើការផ្ទៀងផ្ទាត់ការប្រើប្រាស់អំពូលភ្លើង (ប្តូរមកប្រើ LED) និងដកដោតឆ្នាំងបាយ ឬឧបករណ៍ផ្ទះបាយភ្លាមៗបន្ទាប់ពីចម្អិនរួច ដើម្បីបញ្ចៀសការរត់ចរន្តទទេឥតប្រយោជន៍។
                </p>
              </div>

              <div className="space-y-2 border-t md:border-t-0 md:border-l border-dashed border-slate-200 md:pl-6">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-xs uppercase tracking-wide">
                  <Leaf size={15} /> ទម្លាប់សន្សំសំចៃល្អ
                </div>
                <h4 className="text-sm font-bold text-slate-800">ការចូលរួមការពារបរិស្ថាន</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ការកាត់បន្ថយការប្រើប្រាស់ថាមពលនៅម៉ោងមមាញឹក ជួយកាត់បន្ថយការផ្ទុកលើសទម្ងន់នៃបណ្តាញអគ្គិសនីជាតិក្នុងរដូវប្រាំង។ វាក៏ជួយឱ្យប្រព័ន្ធវ៉ុលចរន្តអគ្គិសនីនៅតាមបណ្តាខេត្ត និងរាជធានីភ្នំពេញ មានស្ថិរភាពល្អ ជៀសវាងការដាច់ចរន្តញឹកញាប់។
                </p>
              </div>

            </div>

          </div>
        )}

        {/* TAB 6: REPORT CARD VIEW (PRINT / EXPORT CAPABLE) */}
        {selectedTab === 'report' && (
          <div className="space-y-6">
            
            {/* INVOICE CARD */}
            <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm space-y-6 relative max-w-3xl mx-auto" id="printable-area">
              
              {/* Header inside invoice */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-150 pb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">របាយការណ៍សវនកម្មអគ្គិសនីប្រចាំខែ</span>
                  <h2 className="text-xl font-display font-bold text-[#14305f]">
                    របាយការណ៍វិភាគថាមពលគេហដ្ឋាន
                  </h2>
                  <p className="text-xs text-slate-500">
                    កាលបរិច្ឆេទបង្កើត៖ {new Date().toLocaleDateString('km-KH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                
                {/* Print action no-print */}
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer no-print"
                >
                  <Printer size={14} /> បោះពុម្ព ឬរក្សាទុកជា PDF
                </button>
              </div>

              {/* Meta information tags */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#fcfdfa] border border-emerald-300/30 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">គណនីគំរូ៖</span>
                  <span className="font-bold text-slate-800">KH-ENERGY-SAMPLE</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">តំបន់គណនា៖</span>
                  <span className="font-bold text-[#14305f]">ព្រះរាជាណាចក្រកម្ពុជា</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">អត្រាប្តូរប្រាក់៖</span>
                  <span className="font-mono text-slate-800 font-semibold">1 USD = {KHR_PER_USD} រៀល</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[10px]">ប្រភេទពន្ធ EDC៖</span>
                  <span className="font-bold text-emerald-600 uppercase">{isCommercial ? 'ពន្ធអាជីវកម្មរួម' : 'ពន្ធលំនៅឋានតាមកម្រិត'}</span>
                </div>
              </div>

              {/* Receipt Summary Values */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">សេចក្តីសង្ខេបការប្រើប្រាស់ប្រចាំខែ (Extrapolated Monthly)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">បរិមាណប្រើប្រាស់ប្រចាំខែ</span>
                    <span className="text-xl font-bold font-mono text-slate-900">{monthlyKwh.toFixed(1)} <span className="text-xs font-sans font-medium text-slate-500">kWh</span></span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">ការប៉ាន់ស្មានថ្លៃអគ្គិសនី</span>
                    <span className="text-xl font-bold font-mono text-[#14305f] block leading-none">{formatKhr(stats.totalCostKhr)}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 font-mono mt-0.5 inline-block">{formatUsd(stats.totalCostUsd)} USD</span>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150">
                    <span className="text-slate-500 text-[10px] block font-semibold uppercase">ទីតាំងដែលប្រើច្រើនជាងគេ</span>
                    <span className="text-sm font-bold text-slate-800 block truncate">{stats.highestConsumingRoom}</span>
                    <span className="text-[9px] text-slate-400 block">ឧបករណ៍កំពូល៖ {stats.highestConsumingDevice}</span>
                  </div>
                </div>
              </div>

              {/* PROGRESSIVE BREAKDOWN TABLE */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider font-display">តារាងគណនាលម្អិតតាមកម្រិតពន្ធអគ្គិសនីកម្ពុជា</h3>
                
                <div className="border border-slate-150 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-150">
                        <th className="p-3">កម្រិតកាលកំណត់ / ការពិពណ៌នា</th>
                        <th className="p-3 font-mono">បរិមាណប្រើប្រាស់ (kWh)</th>
                        <th className="p-3 font-mono">អត្រាពន្ធ (រៀល)</th>
                        <th className="p-3 text-right">តម្លៃសរុប (រៀល)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-medium">
                      {edcBill.breakdown.map((row, index) => (
                        <tr key={index}>
                          <td className="p-3 text-slate-700">{row.slab.replace("kWh", "គីឡូវ៉ាត់ម៉ោង").replace("Commercial/Business Flat Rate", "ពន្ធអាជីវកម្មអត្រារួមស្មើ")}</td>
                          <td className="p-3 font-mono text-slate-600">{row.kwhInSlab.toFixed(1)}</td>
                          <td className="p-3 font-mono text-slate-600">{row.rate} ៛</td>
                          <td className="p-3 text-right text-slate-900 font-mono font-bold">{row.costKhr.toLocaleString()} ៛</td>
                        </tr>
                      ))}
                      {/* Total line */}
                      <tr className="bg-slate-50 font-bold text-slate-900">
                        <td className="p-3 text-slate-500">ការប៉ាន់ស្មានតម្លៃសរុបប្រចាំខែ (Estimated Monthly Total)</td>
                        <td className="p-3 font-mono">{monthlyKwh.toFixed(1)} kWh</td>
                        <td className="p-3 text-slate-400">—</td>
                        <td className="p-3 text-right text-[#14305f] font-mono text-xs md:text-sm">{stats.totalCostKhr.toLocaleString()} ៛</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SAVING SUGGESTION CHECKLISTS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-wider">អនុសាសន៍សន្សំសំចៃអគ្គិសនីសម្រាប់គេហដ្ឋានខ្មែរ</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
                    <span className="font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle size={15} /> ដំណោះស្រាយបន្ទាន់ (ចំណាយ ០ រៀល)
                    </span>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-600 leading-relaxed">
                      <li>ដកឌុយឆ្នាំងបាយអគ្គិសនីចេញភ្លាមបន្ទាប់ពីបាយឆ្អិន (សន្សំប្រហែល ១០០ វ៉ាត់)</li>
                      <li>បិទកុងតាក់ធំរបស់ទូរទស្សន៍ និងឧបករណ៍កម្សាន្តនានា កុំទុករបៀប Standby</li>
                      <li>កំណត់សីតុណ្ហភាពម៉ាស៊ីនត្រជាក់បន្ទប់គេងត្រឹម ២៥°C និងបើកល្បឿនកង្ហារជំនួយ</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-150/40 space-y-2">
                    <span className="font-bold text-indigo-800 flex items-center gap-1">
                      <TrendingUp size={15} /> ការកែលម្អនាពេលអនាគត (វិនិយោគដើម្បីសន្សំរហូត)
                    </span>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-600 leading-relaxed">
                      <li>ជំនួសអំពូលម៉ែត្រចាស់ៗនៅក្នុងបន្ទប់ដោយអំពូលម៉ែត្រប្រភេទ LED ១៨ វ៉ាត់</li>
                      <li>ត្រួតពិនិត្យរ៉ងទ្វារទូទឹកកក (រ៉ងធូរធ្វើឱ្យទូទឹកកកប្រឹងត្រជាក់ និងស៊ីភ្លើងទ្វេដង)</li>
                      <li>ជ្រើសរើសទិញឧបករណ៍ដែលមានបច្ចេកវិទ្យា Inverter ពេលប្តូរឧបករណ៍ថ្មី</li>
                    </ul>
                  </div>

                </div>
              </div>

              {/* Signature block printed at bottom */}
              <div className="border-t border-slate-150 pt-6 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-400 gap-2">
                <span>លេខសម្គាល់សវនកម្ម៖ {Math.random().toString(36).substring(2, 10).toUpperCase()}-KHMER-ENERGY</span>
                <span className="font-mono">Smart Energy Monitor Cambodia. All rights reserved.</span>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pt-6 border-t border-slate-300 w-full text-center text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-3 no-print">
        <div>
          <strong>ប្រព័ន្ធតាមដានការប្រើប្រាស់អគ្គិសនីកម្ពុជា</strong> — បង្កើតឡើងដោយគិតគូរពីភាពងាយស្រួល ប្រើប្រាស់ពណ៌ស្រាល និងរចនាសម្ព័ន្ធទិន្នន័យ (Hash, Tree, Graph) ដើម្បីជួយសន្សំសំចៃថាមពល។
        </div>
        <div className="font-mono text-[10px] text-slate-500">
          កំណែទម្រង់ពន្ធ EDC៖ ២០២៦/២០២៧ • អត្រាប្តូរប្រាក់ ៤១០០ រៀល/USD
        </div>
      </footer>

    </div>
  );
}
