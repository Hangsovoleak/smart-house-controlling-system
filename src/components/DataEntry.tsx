/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Device, DeviceCategory } from '../types';
import { PlusCircle, Trash2, Zap, HelpCircle, Sparkles, Sliders, CheckCircle, Search, Home } from 'lucide-react';

interface DataEntryProps {
  devices: Device[];
  onAddDevice: (device: Omit<Device, 'id'>) => void;
  onUpdateDevice: (updated: Device) => void;
  onDeleteDevice: (id: string) => void;
}

const PRESETS = [
  { name: "ម៉ាស៊ីនត្រជាក់អាំងវែទ័រ (Inverter AC)", watts: 1000, category: "cooling" as const, hours: 6 },
  { name: "កង្ហារអគ្គិសនី", watts: 65, category: "cooling" as const, hours: 10 },
  { name: "ឆ្នាំងបាយអគ្គិសនី", watts: 600, category: "kitchen" as const, hours: 1 },
  { name: "ទូទឹកកកទ្វារពីរ", watts: 160, category: "kitchen" as const, hours: 24 },
  { name: "ទូរទស្សន៍ឆ្លាតវៃ (TV)", watts: 110, category: "entertainment" as const, hours: 4 },
  { name: "អំពូលម៉ែត្រ LED", watts: 18, category: "lighting" as const, hours: 6 },
  { name: "ម៉ាស៊ីនបូមទឹក", watts: 750, category: "utilities" as const, hours: 0.5 },
  { name: "កំសៀវទឹកក្តៅអគ្គិសនី", watts: 1500, category: "kitchen" as const, hours: 0.3 },
  { name: "ម៉ាស៊ីនបោកខោអាវ", watts: 400, category: "utilities" as const, hours: 1 },
  { name: "ឆ្នាំងសាកកុំព្យូទ័រ និងទូរស័ព្ទ", watts: 80, category: "other" as const, hours: 5 },
];

export default function DataEntry({ devices, onAddDevice, onUpdateDevice, onDeleteDevice }: DataEntryProps) {
  const [name, setName] = useState('');
  const [roomName, setRoomName] = useState('បន្ទប់គេង');
  const [powerWatts, setPowerWatts] = useState<number>(60);
  const [category, setCategory] = useState<DeviceCategory>('cooling');
  const [usageHours, setUsageHours] = useState<number>(4);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [roomInputType, setRoomInputType] = useState<'select' | 'custom'>('select');
  const [customRoom, setCustomRoom] = useState('');

  const uniqueRooms = Array.from(new Set(devices.map(d => d.roomName))).filter(Boolean);
  const currentRoomValue = roomInputType === 'select' ? roomName : customRoom;

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setPowerWatts(preset.watts);
    setCategory(preset.category);
    setUsageHours(preset.hours);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalRoom = currentRoomValue.trim() || 'បន្ទប់គេង';

    onAddDevice({
      name: name.trim(),
      roomName: finalRoom,
      powerWatts,
      category,
      usageHours,
      isActive: true
    });

    // Reset some fields
    setName('');
    if (roomInputType === 'custom') {
      setRoomInputType('select');
      setRoomName(finalRoom);
    }
  };

  const getCategoryColor = (cat: DeviceCategory) => {
    switch (cat) {
      case 'cooling': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'kitchen': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'entertainment': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'lighting': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'utilities': return 'bg-teal-50 text-teal-700 border-teal-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const getCategoryNameKhmer = (cat: DeviceCategory) => {
    switch (cat) {
      case 'cooling': return 'ប្រព័ន្ធត្រជាក់';
      case 'kitchen': return 'ផ្ទះបាយ';
      case 'entertainment': return 'កម្សាន្ត / ទូរទស្សន៍';
      case 'lighting': return 'អំពូលភ្លើង';
      case 'utilities': return 'ម៉ាស៊ីនបូមទឹក / ឧបករណ៍ប្រើប្រាស់';
      default: return 'ផ្សេងៗ';
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.roomName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="data-entry-module">
      {/* Input Side */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <PlusCircle size={20} id="add-device-icon" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">បញ្ចូលឧបករណ៍អគ្គិសនីក្នុងផ្ទះ</h2>
              <p className="text-xs text-slate-500">កំណត់កម្លាំងអគ្គិសនី និងម៉ោងប្រើប្រាស់</p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="mb-5">
            <span className="text-xs font-medium text-slate-400 block mb-2 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> គំរូឧបករណ៍ដែលមានស្រាប់
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-50 rounded-lg bg-slate-50/50">
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="text-[11px] px-2.5 py-1.5 rounded-md bg-white border border-slate-100 hover:border-emerald-500 hover:text-emerald-600 transition-all font-medium shadow-2xs text-slate-600 cursor-pointer"
                >
                  {p.name} ({p.watts}W)
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ឈ្មោះឧបករណ៍</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ឧ. ម៉ាស៊ីនត្រជាក់បន្ទប់គេង, ទូទឹកកកផ្ទះបាយ"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-slate-400 text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">កម្លាំងអគ្គិសនី (វ៉ាត់ - W)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={powerWatts || ''}
                    onChange={e => setPowerWatts(Number(e.target.value))}
                    className="w-full text-sm pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono text-slate-800"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">W</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ប្រភេទឧបករណ៍</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as DeviceCategory)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white text-slate-800"
                >
                  <option value="cooling">ប្រព័ន្ធត្រជាក់</option>
                  <option value="kitchen">ផ្ទះបាយ</option>
                  <option value="entertainment">កម្សាន្ត / ទូរទស្សន៍</option>
                  <option value="lighting">អំពូលភ្លើង</option>
                  <option value="utilities">ម៉ាស៊ីនបូមទឹក / ឧបករណ៍ប្រើប្រាស់</option>
                  <option value="other">ផ្សេងៗ</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-600">បន្ទប់ / ទីតាំង</label>
                <button
                  type="button"
                  onClick={() => setRoomInputType(roomInputType === 'select' ? 'custom' : 'select')}
                  className="text-[10px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                >
                  {roomInputType === 'select' ? '+ បន្ថែមបន្ទប់ថ្មី' : 'ជ្រើសរើសបន្ទប់ដែលមានស្រាប់'}
                </button>
              </div>

              {roomInputType === 'select' ? (
                <select
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-white text-slate-800"
                >
                  {uniqueRooms.length > 0 ? (
                    uniqueRooms.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))
                  ) : (
                    <>
                      <option value="បន្ទប់គេង">បន្ទប់គេង</option>
                      <option value="បន្ទប់ទទួលភ្ញៀវ">បន្ទប់ទទួលភ្ញៀវ</option>
                      <option value="ផ្ទះបាយ">ផ្ទះបាយ</option>
                      <option value="កន្លែងប្រើប្រាស់ទូទៅ">កន្លែងប្រើប្រាស់ទូទៅ</option>
                    </>
                  )}
                </select>
              ) : (
                <input
                  type="text"
                  value={customRoom}
                  onChange={e => setCustomRoom(e.target.value)}
                  placeholder="ឧ. បន្ទប់ជួលលេខ ៣, បន្ទប់ផ្ទុកឥវ៉ាន់"
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                  required
                />
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-600">រយៈពេលប្រើប្រាស់ប្រចាំថ្ងៃ</label>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-sm">
                  {usageHours} ម៉ោង/ថ្ងៃ
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="24"
                step="0.1"
                value={usageHours}
                onChange={e => setUsageHours(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 my-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>០.១ ម៉ោង</span>
                <span>១២ ម៉ោង</span>
                <span>២៤ ម៉ោង</span>
              </div>
            </div>

            <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/35 flex items-start gap-2.5">
              <Zap className="text-emerald-600 shrink-0 mt-0.5" size={14} />
              <div className="text-[11px] text-slate-600">
                <span className="font-semibold text-slate-800 block">ការប៉ាន់ស្មានការប្រើប្រាស់ប្រចាំថ្ងៃ:</span>
                {((powerWatts * usageHours) / 1000).toFixed(3)} គីឡូវ៉ាត់ម៉ោង (kWh) ក្នុងមួយថ្ងៃ
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#14305f] hover:bg-slate-850 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              id="submit-device-btn"
            >
              <PlusCircle size={16} /> រក្សាទុកទិន្នន័យ
            </button>
          </form>
        </div>
      </div>

      {/* Devices List Side */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col h-full min-h-[500px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">បញ្ជីឧបករណ៍បច្ចុប្បន្ន</h2>
              <p className="text-xs text-slate-500">គ្រប់គ្រង បើក/បិទ និងកែសម្រួលម៉ោងប្រើប្រាស់ឧបករណ៍ទាំងអស់</p>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="ស្វែងរកឧបករណ៍ ឬបន្ទប់..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 rounded-xl transition-all text-slate-800"
              />
            </div>
          </div>

          {/* Table / List */}
          <div className="flex-1 overflow-y-auto space-y-3 max-h-[460px] pr-1">
            {filteredDevices.length > 0 ? (
              filteredDevices.map(device => {
                const dailyKwh = (device.powerWatts * device.usageHours) / 1000;
                return (
                  <div 
                    key={device.id} 
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      device.isActive 
                        ? 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs' 
                        : 'bg-slate-50/80 border-dashed border-slate-200 opacity-60'
                    }`}
                    id={`device-card-${device.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg border ${getCategoryColor(device.category)}`}>
                        <Zap size={16} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-800 leading-tight">
                            {device.name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {device.roomName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
                          <span className="font-mono">{device.powerWatts}W</span>
                          <span>•</span>
                          <span className="text-emerald-600 font-semibold">{dailyKwh.toFixed(2)} kWh/ថ្ងៃ</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-slate-50 pt-3 md:pt-0">
                      {/* Hours Slider inside card */}
                      <div className="flex items-center gap-2 flex-1 md:flex-initial">
                        <Sliders size={14} className="text-slate-400" />
                        <div className="w-24 md:w-28">
                          <input
                            type="range"
                            min="0.1"
                            max="24"
                            step="0.1"
                            value={device.usageHours}
                            onChange={e => onUpdateDevice({ ...device, usageHours: Number(e.target.value) })}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            title="លៃតម្រូវម៉ោង"
                          />
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[9px] text-slate-400 font-mono">ម៉ោងប្រើប្រាស់:</span>
                            <span className="text-[9px] font-mono font-bold text-slate-700 bg-slate-100 px-1 rounded-xs">
                              {device.usageHours} ម៉ោង
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-2">
                        {/* Active Switch */}
                        <button
                          onClick={() => onUpdateDevice({ ...device, isActive: !device.isActive })}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                            device.isActive ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}
                          title={device.isActive ? 'បិទឧបករណ៍' : 'បើកឧបករណ៍'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              device.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => onDeleteDevice(device.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                          title="លុបឧបករណ៍"
                          id={`delete-btn-${device.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-3">
                  <Sliders size={28} />
                </div>
                <h3 className="text-sm font-semibold text-slate-700">រកមិនឃើញឧបករណ៍តាមការស្វែងរកឡើយ</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">សូមព្យាយាមកែសម្រួលពាក្យស្វែងរក ឬបន្ថែមឧបករណ៍ថ្មីខាងលើ។</p>
              </div>
            )}
          </div>

          {/* Quick stats on the list footer */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-xs font-medium text-slate-500">
            <span>ឧបករណ៍សរុប: {devices.length}</span>
            <span>កំពុងដំណើរការ: {devices.filter(d => d.isActive).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
