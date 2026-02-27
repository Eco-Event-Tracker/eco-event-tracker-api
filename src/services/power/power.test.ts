/**
 * Example usage of the Power Emission calculator
 * Run with: npx ts-node power.example.ts
 */

import { calculatePowerEmissions, PowerEntry } from "./power.service.js";

export default function TestPowerCalculation() {
  var log = "";

  // -------------------------------------------------------------------------
  // Test 1: Typical Nigerian event — grid + diesel backup
  // -------------------------------------------------------------------------
  log += "=== Test 1: Grid + Diesel Backup (typical Nigerian event) ===\n\n";

  const scenario1: PowerEntry[] = [
    // Grid available for first 4 hours (lighting, AV)
    { source: "grid_electricity", durationHours: 4, loadKw: 50 },
    // Generator running all 8 hours as backup/primary (PA system, catering equipment)
    { source: "diesel_generator", durationHours: 8, loadKw: 25 },
  ];

  const result1 = calculatePowerEmissions(scenario1);

  log += `Total energy  : ${result1.totalKwh} kWh\n`;
  log += `Total emissions: ${result1.totalKgCO2e} kg CO2e\n\n`;
  log += "--- By Source ---\n";
  result1.bySource.forEach(({ source, totalKwh, totalKgCO2e, emissionFactor, scope }) => {
    log += `  ${source.padEnd(20)}: ${totalKwh.toFixed(2)} kWh × ${emissionFactor} kg CO2e/kWh = ${totalKgCO2e.toFixed(3)} kg CO2e  [${scope}]\n`;
  });
  log += "\n--- Notes ---\n";
  result1.notes.forEach((note) => log += `  • ${note}\n`);

  // -------------------------------------------------------------------------
  // Test 2: Solar + generator hybrid (outdoor event)
  // -------------------------------------------------------------------------
  log += "\n=== Test 2: Solar + Diesel Hybrid (outdoor event) ===\n\n";

  const scenario2: PowerEntry[] = [
    { source: "solar",            totalKwh: 40 },
    { source: "diesel_generator", durationHours: 6, loadKw: 15 },
  ];

  const result2 = calculatePowerEmissions(scenario2);

  log += `Total energy  : ${result2.totalKwh} kWh\n`;
  log += `Total emissions: ${result2.totalKgCO2e} kg CO2e\n\n`;
  log += "--- By Source ---\n";
  result2.bySource.forEach(({ source, totalKwh, totalKgCO2e, emissionFactor, scope }) => {
    log += `  ${source.padEnd(20)}: ${totalKwh.toFixed(2)} kWh × ${emissionFactor} kg CO2e/kWh = ${totalKgCO2e.toFixed(3)} kg CO2e  [${scope}]\n`;
  });
  log += "\n--- Notes ---\n";
  result2.notes.forEach((note) => log += `  • ${note}\n`);

  // -------------------------------------------------------------------------
  // Test 3: Total kWh already known (e.g., from venue electricity bill)
  // -------------------------------------------------------------------------
  log += "\n=== Test 3: Known kWh from venue bill ===\n\n";

  const scenario3: PowerEntry[] = [
    { source: "grid_electricity", totalKwh: 320 },
    { source: "natural_gas",      totalKwh: 80  },
  ];

  const result3 = calculatePowerEmissions(scenario3);

  log += `Total energy  : ${result3.totalKwh} kWh\n`;
  log += `Total emissions: ${result3.totalKgCO2e} kg CO2e\n\n`;
  log += "--- By Source ---\n";
  result3.bySource.forEach(({ source, totalKwh, totalKgCO2e, emissionFactor, scope }) => {
    log += `  ${source.padEnd(20)}: ${totalKwh.toFixed(2)} kWh × ${emissionFactor} kg CO2e/kWh = ${totalKgCO2e.toFixed(3)} kg CO2e  [${scope}]\n`;
  });
  log += `\nSource: ${result3.source}\n`;

  // -------------------------------------------------------------------------
  // Test 4: Load estimated from participant count
  // -------------------------------------------------------------------------
  log += "\n=== Test 4: Participant-based load estimation (300 attendees, 8 hours) ===\n\n";

  const scenario4 = calculatePowerEmissions([
    { source: "grid_electricity", durationHours: 4, participantCount: 300 },
    { source: "diesel_generator", durationHours: 8, participantCount: 300 },
  ]);

  log += `Total energy   : ${scenario4.totalKwh} kWh\n`;
  log += `Total emissions: ${scenario4.totalKgCO2e} kg CO2e\n\n`;
  log += "--- By Source ---\n";
  scenario4.bySource.forEach(({ source, totalKwh, totalKgCO2e, emissionFactor, estimatedLoadKw }) => {
    const est = estimatedLoadKw !== undefined ? `  [estimated: ${estimatedLoadKw.toFixed(1)} kW]` : "";
    log += `  ${source.padEnd(20)}: ${totalKwh.toFixed(2)} kWh x ${emissionFactor} = ${totalKgCO2e.toFixed(3)} kg CO2e${est}\n`;
  });
  log += "\n--- Notes ---\n";
  scenario4.notes.forEach((note) => (log += `  * ${note}\n`));

  return log;
}