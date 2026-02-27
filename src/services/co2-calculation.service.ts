import { EventEmissionDataRow, EventEmissionBreakdown, EmissionFactorRow } from '../types/events';
import { estimateCateringEmissions } from './catering/catering.service';
import { calculatePowerEmissions } from './power/power.service';
import { calculateTransportEmissions, estimateTransportEmissions } from './transport/transport.service';
import { calculateWasteEmissions } from './waste/waste.service';

export interface Co2ComputationResult {
  total_co2: number;
  breakdown: EventEmissionBreakdown;
}

export interface Co2CalculationServiceEmissionData extends EventEmissionDataRow {
  num_participants: number
}

// export interface Co2CalculationService {
//   calculate(
//     emissionData: EventEmissionDataRow,
//     factors: EmissionFactorRow[]
//   ): Promise<Co2ComputationResult> | Co2ComputationResult;
// }

class Co2CalculationService {
  calculate(emissionData: Co2CalculationServiceEmissionData): Co2ComputationResult {
    const wasteCo2 = calculateWasteEmissions([{
      wasteType: "mixed",
      disposalMethod: "recycling",
      quantityG: emissionData.waste_kg / 1_000,
    }]);
    const transportCo2 = estimateTransportEmissions(emissionData.num_participants);
    const powerCo2 = calculatePowerEmissions([{
      totalKwh: emissionData.energy_kwh,
      source: "grid_electricity",
    }]);
    const cateringCo2 = estimateCateringEmissions(emissionData.catering_meals);
    return {
      total_co2: emissionData.total_co2,
      breakdown: {
        energy: powerCo2.totalKgCO2e,
        travel: transportCo2.totalKgCO2e,
        catering: cateringCo2.totalKgCO2e,
        waste: wasteCo2.totalKgCO2e
      }
    };
  }
}

export const co2CalculationService: Co2CalculationService = new Co2CalculationService();
