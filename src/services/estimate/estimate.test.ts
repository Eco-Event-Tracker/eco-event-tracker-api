/**
 * Worked scenarios for the estimation engine — mirrors how real events run.
 * Visit /test-estimate to see the output, the same way the other modules expose
 * their self-checks.
 */

import { estimateEventEmissions } from "./estimate.service";
import { EstimateInput, EstimateResult } from "../../types/estimate";

function renderScenario(label: string, input: EstimateInput): string {
  const r: EstimateResult = estimateEventEmissions(input);
  let log = `=== ${label} ===\n`;
  log += `Total            : ${r.total} kg CO2e\n`;
  log += `Per attendee     : ${r.perAttendee} kg CO2e\n`;
  log += `Biggest driver   : ${r.biggestContributor.category} ` +
    `(${r.biggestContributor.kg} kg, ${r.biggestContributor.pct}%)\n`;
  log += `Breakdown        : energy ${r.breakdown.energy} | travel ${r.breakdown.travel} | ` +
    `catering ${r.breakdown.catering} | waste ${r.breakdown.waste} | streaming ${r.breakdown.streaming}\n`;
  log += "Top actions:\n";
  if (r.topActions.length === 0) {
    log += "  (already lean — no major levers)\n";
  } else {
    r.topActions.forEach((a) => {
      log += `  • ${a.action}: save ${a.savingKg} kg (${a.savingPct}%)\n`;
    });
  }
  log += "Assumptions:\n";
  r.assumptions.forEach((a) => (log += `  - ${a}\n`));
  return log + "\n";
}

export default function TestEstimateCalculation(): string {
  let log = "EcoEvent — estimation engine scenarios\n\n";

  // 1) Small physical workshop on a generator (Lagos context)
  log += renderScenario("Small workshop — 40 people, 4 h, generator, local", {
    format: "in_person",
    attendance: 40,
    duration_hours: 4,
    power_source: "generator",
    audience_reach: "local",
    catering: "mixed",
    waste_disposal: "landfill",
  });

  // 2) Large physical conference (the Decagon Buildathon shape)
  log += renderScenario("Large conference — 330 people, 8 h, grid+gen, local, meat-heavy", {
    format: "in_person",
    attendance: 330,
    duration_hours: 8,
    power_source: "mixed",
    audience_reach: "local",
    catering: "meat_heavy",
    waste_disposal: "landfill",
  });

  // 3) Hybrid event — 100 in the room, 400 online
  log += renderScenario("Hybrid — 100 in-room + 400 online, 3 h, HD", {
    format: "hybrid",
    attendance: 100,
    online_attendance: 400,
    duration_hours: 3,
    power_source: "grid",
    audience_reach: "regional",
    catering: "mixed",
    waste_disposal: "recycling",
    stream_quality: "hd",
  });

  // 4) Fully virtual webinar
  log += renderScenario("Virtual webinar — 500 online, 2 h, HD", {
    format: "virtual",
    attendance: 0,
    online_attendance: 500,
    duration_hours: 2,
    stream_quality: "hd",
  });

  return log;
}
