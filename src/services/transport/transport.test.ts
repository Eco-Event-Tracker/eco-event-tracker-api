/**
 * Example usage of the Transport Emission calculators
 * Run with: npx ts-node transport.example.ts
 */

import {
  calculateTransportEmissions,
  estimateTransportEmissions,
  ParticipantJourney,
} from "./transport.service.js";

export default function TestTransportCalculation() {
  var log = "";

  // -------------------------------------------------------------------------
  // Test 1: calculateTransportEmissions — known per-participant data
  // -------------------------------------------------------------------------
  log += "=== Test 1: Per-Participant Transport Emissions ===\n\n";

  const journeys: ParticipantJourney[] = [
    // Local attendees driving in
    { distanceKm: 8,   mode: "car_petrol"  },
    { distanceKm: 22,  mode: "car_petrol"  },
    { distanceKm: 5,   mode: "car_electric" },
    // Regional attendees by train
    { distanceKm: 120, mode: "train"       },
    { distanceKm: 180, mode: "train"       },
    // Attendee taking the bus
    { distanceKm: 30,  mode: "bus"         },
    // Remote attendees flying
    { distanceKm: 900, mode: "flight"      }, // short-haul
    { distanceKm: 5500, mode: "flight"     }, // long-haul
  ];

  const result1 = calculateTransportEmissions(journeys);

  log += `Total emissions: ${result1.totalKgCO2e} kg CO2e\n`;
  log += `Source: ${result1.source}\n\n`;
  log += "--- By Mode ---\n";
  result1.byMode.forEach(({ mode, totalKgCO2e }) => {
    log += `  ${mode.padEnd(16)}: ${totalKgCO2e.toFixed(4)} kg CO2e\n`;
  });

  // -------------------------------------------------------------------------
  // Test 2: estimateTransportEmissions — count only, auto-inferred preset
  // -------------------------------------------------------------------------
  log += "\n=== Test 2: Estimated Emissions - 350 Participants (auto-inferred) ===\n\n";

  const result2 = estimateTransportEmissions(350);

  log += `Inferred preset : ${result2.inferredPreset} (${result2.presetSource})\n`;
  log += `Total emissions : ${result2.totalKgCO2e} kg CO2e\n\n`;
  log += "--- Assumptions ---\n";
  result2.assumptions.forEach(({ band, probability, representativeKm, mode, participantsEstimated, kgCO2e }) => {
    log += `  ${band.padEnd(14)} | ${String(Math.round(probability * 100) + "%").padEnd(5)} | ~${participantsEstimated} participants | ${representativeKm}km by ${mode.padEnd(14)} | ${kgCO2e} kg CO2e\n`;
  });

  // -------------------------------------------------------------------------
  // Test 3: estimateTransportEmissions — explicit preset override
  // -------------------------------------------------------------------------
  log += "\n=== Test 3: Estimated Emissions - 150 Participants, preset overridden to 'national' ===\n\n";

  const result3 = estimateTransportEmissions(150, { preset: "national" });

  log += `Inferred preset : ${result3.inferredPreset} → overridden to 'national' (${result3.presetSource})\n`;
  log += `Total emissions : ${result3.totalKgCO2e} kg CO2e\n\n`;
  log += "--- By Mode ---\n";
  result3.byMode.forEach(({ mode, totalKgCO2e }) => {
    log += `  ${mode.padEnd(16)}: ${totalKgCO2e.toFixed(4)} kg CO2e\n`;
  });

  // -------------------------------------------------------------------------
  // Test 4: estimateTransportEmissions — custom PDF
  // -------------------------------------------------------------------------
  log += "\n=== Test 4: Estimated Emissions - 200 Participants, custom PDF ===\n\n";

  const result4 = estimateTransportEmissions(200, {
    customPDF: [
      { minKm: 0,   maxKm: 8,        probability: 0.50, representativeKm: 4,   mode: "car_petrol" },
      { minKm: 8,   maxKm: 25,       probability: 0.20, representativeKm: 15,  mode: "car_petrol" },
      { minKm: 25,  maxKm: 50,       probability: 0.15, representativeKm: 35,  mode: "car_petrol" },
      { minKm: 50,  maxKm: 200,      probability: 0.10, representativeKm: 100, mode: "train"      },
      { minKm: 200, maxKm: Infinity, probability: 0.05, representativeKm: 500, mode: "flight"     },
    ],
  });

  log += `Total emissions : ${result4.totalKgCO2e} kg CO2e\n\n`;
  log += "--- Assumptions ---\n";
  result4.assumptions.forEach(({ band, probability, representativeKm, mode, participantsEstimated, kgCO2e }) => {
    log += `  ${band.padEnd(14)} | ${String(Math.round(probability * 100) + "%").padEnd(5)} | ~${participantsEstimated} participants | ${representativeKm}km by ${mode.padEnd(14)} | ${kgCO2e} kg CO2e\n`;
  });

  return log;
}