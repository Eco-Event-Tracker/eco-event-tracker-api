/**
 * Example usage of the WasteEmission calculator
 * Run with: npx ts-node wasteEmissions.example.ts
 */

import { calculateWasteEmissions, WasteItem } from "./waste.service.js";

// Simulate a 200-person evening event
const eventWaste: WasteItem[] = [
  // Food scraped from plates → composted
  { wasteType: "food", disposalMethod: "composting", quantityG: 40_000 },

  // Napkins and paper plates → landfill
  { wasteType: "paper_cardboard", disposalMethod: "landfill", quantityG: 15_000 },

  // Cardboard packaging → recycled
  { wasteType: "paper_cardboard", disposalMethod: "recycling", quantityG: 8_000 },

  // Plastic cups and cutlery → landfill
  { wasteType: "plastic", disposalMethod: "landfill", quantityG: 12_000 },

  // Glass bottles → recycled
  { wasteType: "glass", disposalMethod: "recycling", quantityG: 25_000 },

  // Aluminium cans → recycled
  { wasteType: "metal", disposalMethod: "recycling", quantityG: 5_000 },

  // Bin bags of misc waste that weren't sorted → landfill
  { wasteType: "mixed", disposalMethod: "landfill", quantityG: 30_000 },
];

export default function TestWasteCalculation() {
  const result = calculateWasteEmissions(eventWaste);
  var log: string = "";
  log += "=== Waste Emission Results ===\n\n";
  log += `Total emissions: ${result.totalKgCO2e} kg CO2e\n`;
  log += `Source: ${result.source}\n\n`;
  
  log += "--- By Waste Type ---\n";
  result.byWasteType.forEach(({ wasteType, totalKgCO2e }) => {
    log += `  ${wasteType.padEnd(16)}: ${totalKgCO2e.toFixed(4)} kg CO2e\n`;
  });
  
  log += "\n--- By Disposal Method ---\n";
  result.byDisposalMethod.forEach(({ disposalMethod, totalKgCO2e }) => {
    log += `  ${disposalMethod.padEnd(16)}: ${totalKgCO2e.toFixed(4)} kg CO2e\n`;
  });

  return log;
}
