/**
 * Example usage of the Virtual Power Emission calculator
 */

import {
  calculateVirtualPowerEmissions,
  VirtualPowerInput,
} from "./virtual-power.service.js";

export default function TestVirtualPowerCalculation() {
  var log = "";

  // -------------------------------------------------------------------------
  // Test 1: Standard virtual event, defaults
  // -------------------------------------------------------------------------
  log += "=== Test 1: 300 participants, 4 hours, HD (defaults) ===\n\n";

  const r1 = calculateVirtualPowerEmissions({
    participantCount: 300,
    durationHours: 4,
  });

  log += `Total emissions : ${r1.totalKgCO2e} kg CO2e\n`;
  log += `Total energy    : ${r1.totalKwh} kWh\n`;
  log += `Total data      : ${r1.totalDataGb} GB\n\n`;
  log += `Assumptions:\n`;
  log += `  Quality         : ${r1.assumptions.quality} (${r1.assumptions.bitrateKbps} kbps)\n`;
  log += `  Participant grid: ${r1.assumptions.participantGridFactor} kg CO2e/kWh\n`;
  log += `  Data centre grid: ${r1.assumptions.dataCentreGridFactor} kg CO2e/kWh\n`;
  log += `  Device profile  : ${r1.assumptions.deviceProfile}\n\n`;
  log += "--- By Layer ---\n";
  r1.byLayer.forEach(({ layer, totalKwh, totalKgCO2e }) => {
    const pct = ((totalKgCO2e / r1.totalKgCO2e) * 100).toFixed(1);
    log += `  ${layer.padEnd(12)}: ${totalKwh.toFixed(3)} kWh → ${totalKgCO2e.toFixed(3)} kg CO2e (${pct}%)\n`;
  });
  log += "\n--- Notes ---\n";
  r1.notes.forEach((n) => (log += `  • ${n}\n`));

  // -------------------------------------------------------------------------
  // Test 2: Audio-only webinar vs full HD comparison
  // -------------------------------------------------------------------------
  log += "\n=== Test 2: Quality comparison — 500 participants, 2 hours ===\n\n";

  const qualities = ["audio_only", "sd", "hd", "full_hd"] as const;
  log += `${"Quality".padEnd(12)} | ${"Data (GB)".padEnd(12)} | ${"Total kWh".padEnd(12)} | kg CO2e\n`;
  log += `${"-".repeat(60)}\n`;

  for (const q of qualities) {
    const r = calculateVirtualPowerEmissions({
      participantCount: 500,
      durationHours: 2,
      quality: q,
    });
    log += `${q.padEnd(12)} | ${r.totalDataGb.toString().padEnd(12)} | ${r.totalKwh.toFixed(2).padEnd(12)} | ${r.totalKgCO2e.toFixed(3)}\n`;
  }

  // -------------------------------------------------------------------------
  // Test 3: Mobile-heavy audience (typical Nigerian event scenario)
  // -------------------------------------------------------------------------
  log += "\n=== Test 3: Mobile-heavy audience (Nigeria context) ===\n\n";

  const r3 = calculateVirtualPowerEmissions({
    participantCount: 200,
    durationHours: 3,
    quality: "sd",
    participantGridFactor: 0.431,
    participantSegments: [
      { count: 130, device: "smartphone", network: "mobile_4g" },
      { count: 50,  device: "laptop",     network: "fixed"     },
      { count: 20,  device: "tablet",     network: "mobile_4g" },
    ],
  });

  log += `Total emissions : ${r3.totalKgCO2e} kg CO2e\n`;
  log += `Per participant : ${(r3.totalKgCO2e / 200).toFixed(3)} kg CO2e\n\n`;
  log += "--- By Layer ---\n";
  r3.byLayer.forEach(({ layer, totalKwh, totalKgCO2e }) => {
    const pct = ((totalKgCO2e / r3.totalKgCO2e) * 100).toFixed(1);
    log += `  ${layer.padEnd(12)}: ${totalKwh.toFixed(3)} kWh → ${totalKgCO2e.toFixed(3)} kg CO2e (${pct}%)\n`;
  });
  log += "\n--- Notes ---\n";
  r3.notes.forEach((n) => (log += `  • ${n}\n`));

  // -------------------------------------------------------------------------
  // Test 4: Hybrid event — only the virtual participants side
  // -------------------------------------------------------------------------
  log += "\n=== Test 4: Hybrid event — 150 virtual participants, 6 hours, HD ===\n\n";
  log += "(Combine with onsite power.service.ts result for full hybrid event total)\n\n";

  const r4 = calculateVirtualPowerEmissions({
    participantCount: 150,
    durationHours: 6,
    quality: "hd",
    participantGridFactor: 0.490, // distributed audience — use global average
    dataCentreGridFactor: 0.100,  // streaming platform uses renewable-heavy grid
  });

  log += `Total emissions : ${r4.totalKgCO2e} kg CO2e\n`;
  log += `Total energy    : ${r4.totalKwh} kWh\n`;
  log += `Source: ${r4.source}\n`;

  return log;
}