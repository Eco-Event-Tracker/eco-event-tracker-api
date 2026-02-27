/**
 * Virtual Event Power Emission Calculator
 *
 * Estimates CO2e emissions from virtual/hybrid event streaming across three
 * layers of the streaming energy chain:
 *
 *   1. END-USER DEVICES  — participant screens, cameras, audio
 *   2. NETWORK TRANSMISSION — data centre ↔ ISP ↔ participant (fixed + mobile)
 *   3. DATA CENTRES — encoding, CDN, cloud infrastructure
 *
 * Each layer can be independently configured or left to defaults based on
 * the streaming profile selected.
 *
 * --- Emission Factors & Methodology ---
 *
 * Network transmission:
 *   - Fixed broadband: 0.000072 kWh/GB (Aslan et al. 2018, updated by
 *     IEA/Malmodin 2020-2021; consensus midpoint for fixed broadband)
 *   - Mobile (4G): 0.00088 kWh/GB  (IEA 2020; ~12× fixed due to radio overhead)
 *   - Mobile (5G): 0.00023 kWh/GB  (IEA/Ericsson 2022; more efficient per bit)
 *   Note: Network energy per GB has been falling ~50% every 2 years (Koomey's
 *   Law for networks). The above represent 2022-era midpoints; high-end
 *   estimates (e.g. Shift Project 2019) are no longer considered accurate.
 *
 * Data centres:
 *   - 0.00007 kWh/GB (IEA 2020; large hyperscale CDN/cloud, PUE ~1.2)
 *   Note: This reflects hyperscale infrastructure (AWS/Azure/GCP/Cloudflare).
 *   Self-hosted or smaller servers will be higher; use customDatacentreKwhPerGb
 *   override if needed.
 *
 * End-user devices (average power draw during video conferencing):
 *   - Laptop:        30 W
 *   - Desktop + monitor: 100 W
 *   - Smartphone:    3 W
 *   - Tablet:        7 W
 *   - Smart TV:      90 W
 *   - Video conf. room system: 200 W
 *   Sources: EPRI 2021; Malmodin & Lundén 2018; operator measurement studies
 *
 * Bitrate (video quality presets, kbps):
 *   - audio_only:    64 kbps
 *   - low_sd:        500 kbps  (360p)
 *   - sd:            1500 kbps (720p)
 *   - hd:            3000 kbps (1080p)
 *   - full_hd:       6000 kbps (1080p 60fps / multi-stream)
 *   Sources: Zoom/Teams/WebRTC published encoder defaults
 *
 * Grid electricity:
 *   - Nigeria grid:  0.431 kg CO2e/kWh (IEA 2023)
 *   - Global average: 0.490 kg CO2e/kWh (IEA 2022 global average)
 *   - UK grid:       0.207 kg CO2e/kWh (DEFRA 2024)
 *   - EU average:    0.233 kg CO2e/kWh (EEA 2022)
 *   The Nigeria factor is used by default (event host context).
 *   Participants in other regions can be modelled with participantGridFactor.
 *
 * Framework: GHG Protocol Scope 3 Category 11 (use of sold products /
 * downstream value chain). Device use = Scope 3; data centre energy may be
 * Scope 2 if operator controls it directly.
 *
 * References:
 *   - Aslan et al. (2018). "Electricity Intensity of Internet Data Transmission."
 *     J. Industrial Ecology 22(4).
 *   - IEA (2020). "Data Centres and Data Transmission Networks."
 *   - Malmodin & Lundén (2018). "The Energy and Carbon Footprint of the ICT and
 *     E&M Sectors." Sustainability 10(9).
 *   - Carbon Trust / The Shift Project critiques (2019-2021) — see notes.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VideoQuality =
  | "audio_only"
  | "low_sd"
  | "sd"
  | "hd"
  | "full_hd";

export type DeviceType =
  | "laptop"
  | "desktop"
  | "smartphone"
  | "tablet"
  | "smart_tv"
  | "conference_room";

export type NetworkType = "fixed" | "mobile_4g" | "mobile_5g";

/**
 * Describes a segment of participants sharing the same device/network profile.
 * All segments are summed to produce the total device-side emissions.
 */
export interface ParticipantSegment {
  /** Number of participants in this segment */
  count: number;
  /** Primary device type used */
  device: DeviceType;
  /** Network connection type */
  network: NetworkType;
}

export interface VirtualPowerInput {
  /** Total number of virtual participants */
  participantCount: number;
  /**
   * Duration of the virtual event in hours.
   * Used for device energy and network/data centre data volume calculation.
   */
  durationHours: number;
  /**
   * Video/audio streaming quality.
   * Determines bitrate used in data volume calculation.
   * @default "hd"
   */
  quality?: VideoQuality;
  /**
   * Grid emission factor for participant locations (kg CO2e/kWh).
   * Defaults to Nigeria grid (0.431). Use global average (0.490) if
   * participants are geographically distributed and location is unknown.
   * @default 0.431
   */
  participantGridFactor?: number;
  /**
   * Grid emission factor for the data centre (kg CO2e/kWh).
   * Major cloud CDNs are increasingly powered by renewables; use a lower
   * factor if your streaming platform publishes a specific grid mix.
   * @default 0.490 (IEA global average — conservative for unknown platform)
   */
  dataCentreGridFactor?: number;
  /**
   * Optional breakdown of participants by device and network type.
   * If provided and counts sum to participantCount, used for per-device
   * energy modelling. Otherwise a default profile is applied.
   */
  participantSegments?: ParticipantSegment[];
  /**
   * Override the network energy intensity for fixed broadband (kWh/GB).
   * Use if you have region-specific data.
   */
  customFixedNetworkKwhPerGb?: number;
  /**
   * Override data centre energy intensity (kWh/GB).
   * Use for self-hosted or smaller streaming servers.
   */
  customDatacentreKwhPerGb?: number;
}

export interface LayerBreakdown {
  layer: "devices" | "network" | "data_centre";
  totalKwh: number;
  totalKgCO2e: number;
  detail: string;
}

export interface VirtualPowerEmissionResult {
  totalKgCO2e: number;
  totalKwh: number;
  totalDataGb: number;
  byLayer: LayerBreakdown[];
  assumptions: {
    quality: VideoQuality;
    bitrateKbps: number;
    participantGridFactor: number;
    dataCentreGridFactor: number;
    deviceProfile: string;
  };
  source: string;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BITRATE_KBPS: Record<VideoQuality, number> = {
  audio_only: 64,
  low_sd:     500,
  sd:         1500,
  hd:         3000,
  full_hd:    6000,
};

/** Average power draw per device in Watts during active video conferencing */
const DEVICE_WATTS: Record<DeviceType, number> = {
  laptop:          30,
  desktop:        100,
  smartphone:       3,
  tablet:           7,
  smart_tv:        90,
  conference_room: 200,
};

/** Network energy intensity in kWh per GB */
const NETWORK_KWH_PER_GB: Record<NetworkType, number> = {
  fixed:      0.000072,
  mobile_4g:  0.00088,
  mobile_5g:  0.00023,
};

const DATA_CENTRE_KWH_PER_GB = 0.00007;

/** Default grid factors (kg CO2e/kWh) */
const GRID_FACTORS = {
  nigeria:       0.431,  // IEA 2023, electricity-only generation
  globalAverage: 0.490,  // IEA 2022 global average
  uk:            0.207,  // DEFRA 2024
  eu:            0.233,  // EEA 2022
};

/**
 * Default participant device/network profile when no segments are provided.
 * Based on a typical professional virtual event audience mix.
 */
const DEFAULT_SEGMENT_PROFILE: ParticipantSegment[] = [
  { count: 60, device: "laptop",     network: "fixed"     }, // 60% laptop/fixed
  { count: 20, device: "smartphone", network: "mobile_4g" }, // 20% mobile
  { count: 15, device: "desktop",    network: "fixed"     }, // 15% desktop
  { count: 5,  device: "tablet",     network: "fixed"     }, // 5% tablet
  // Note: counts are percentages; scaled to actual participantCount below
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bitrateToGbPerHour(bitrateKbps: number): number {
  // kbps → GB/hr: (kbps × 3600 seconds) / (8 bits/byte × 1e6 bytes/GB)
  return (bitrateKbps * 3600) / (8 * 1_000_000);
}

function resolveSegments(
  participantCount: number,
  segments?: ParticipantSegment[]
): ParticipantSegment[] {
  if (!segments || segments.length === 0) {
    // Scale default profile to actual participant count
    const total = DEFAULT_SEGMENT_PROFILE.reduce((s, p) => s + p.count, 0);
    return DEFAULT_SEGMENT_PROFILE.map((seg) => ({
      ...seg,
      count: Math.round((seg.count / total) * participantCount),
    }));
  }

  const segTotal = segments.reduce((s, p) => s + p.count, 0);
  if (segTotal !== participantCount) {
    // Scale proportionally if segments don't exactly match
    return segments.map((seg) => ({
      ...seg,
      count: Math.round((seg.count / segTotal) * participantCount),
    }));
  }
  return segments;
}

// ---------------------------------------------------------------------------
// Main calculator
// ---------------------------------------------------------------------------

/**
 * Estimates CO2e emissions from a virtual or hybrid event's streaming activity.
 *
 * The model covers three energy layers:
 * - End-user devices (Scope 3 for the event organiser)
 * - Network data transmission (Scope 3)
 * - Data centre / CDN infrastructure (Scope 2 or 3 depending on control)
 *
 * @param input - Virtual event parameters
 * @returns VirtualPowerEmissionResult with totals, layer breakdown, and notes
 *
 * @example
 * // 300 participants, 4-hour event, HD quality
 * const result = calculateVirtualPowerEmissions({
 *   participantCount: 300,
 *   durationHours: 4,
 *   quality: "hd",
 * });
 *
 * @example
 * // Mixed device audience, distributed internationally
 * const result = calculateVirtualPowerEmissions({
 *   participantCount: 500,
 *   durationHours: 6,
 *   quality: "sd",
 *   participantGridFactor: 0.490, // global average
 *   participantSegments: [
 *     { count: 350, device: "laptop",     network: "fixed"     },
 *     { count: 100, device: "smartphone", network: "mobile_4g" },
 *     { count: 50,  device: "desktop",    network: "fixed"     },
 *   ],
 * });
 */
export function calculateVirtualPowerEmissions(
  input: VirtualPowerInput
): VirtualPowerEmissionResult {
  // --- Validation ---
  if (!Number.isFinite(input.participantCount) || input.participantCount <= 0) {
    throw new Error("participantCount must be a positive number");
  }
  if (!Number.isFinite(input.durationHours) || input.durationHours <= 0) {
    throw new Error("durationHours must be a positive number");
  }

  const quality = input.quality ?? "hd";
  const bitrateKbps = BITRATE_KBPS[quality];
  const participantGridFactor = input.participantGridFactor ?? GRID_FACTORS.nigeria;
  const dataCentreGridFactor = input.dataCentreGridFactor ?? GRID_FACTORS.globalAverage;
  const dcKwhPerGb = input.customDatacentreKwhPerGb ?? DATA_CENTRE_KWH_PER_GB;

  const gbPerParticipantPerHour = bitrateToGbPerHour(bitrateKbps);
  const totalDataGb = gbPerParticipantPerHour * input.participantCount * input.durationHours;

  // --- Layer 1: End-user devices ---
  const segments = resolveSegments(input.participantCount, input.participantSegments);

  let deviceKwh = 0;
  const segmentDetails: string[] = [];

  for (const seg of segments) {
    const watts = DEVICE_WATTS[seg.device];
    const kwh = (watts / 1000) * input.durationHours * seg.count;
    deviceKwh += kwh;
    segmentDetails.push(
      `${seg.count}× ${seg.device} @ ${watts}W × ${input.durationHours}h = ${kwh.toFixed(2)} kWh`
    );
  }

  const deviceKgCO2e = deviceKwh * participantGridFactor;

  // --- Layer 2: Network transmission ---
  let networkKwh = 0;
  for (const seg of segments) {
    const networkFactor = input.customFixedNetworkKwhPerGb !== undefined && seg.network === "fixed"
      ? input.customFixedNetworkKwhPerGb
      : NETWORK_KWH_PER_GB[seg.network];

    const segDataGb = gbPerParticipantPerHour * seg.count * input.durationHours;
    networkKwh += segDataGb * networkFactor;
  }

  // Data centre transmits each stream once upstream; participant downloads
  // are the dominant factor. No double-counting with DC layer.
  const networkKgCO2e = networkKwh * participantGridFactor;

  // --- Layer 3: Data centre / CDN ---
  const dcKwh = totalDataGb * dcKwhPerGb;
  const dcKgCO2e = dcKwh * dataCentreGridFactor;

  // --- Totals ---
  const totalKwh = deviceKwh + networkKwh + dcKwh;
  const totalKgCO2e = deviceKgCO2e + networkKgCO2e + dcKgCO2e;

  // --- Layer breakdown ---
  const byLayer: LayerBreakdown[] = [
    {
      layer: "devices",
      totalKwh: Math.round(deviceKwh * 1000) / 1000,
      totalKgCO2e: Math.round(deviceKgCO2e * 1000) / 1000,
      detail: segmentDetails.join("; "),
    },
    {
      layer: "network",
      totalKwh: Math.round(networkKwh * 1000) / 1000,
      totalKgCO2e: Math.round(networkKgCO2e * 1000) / 1000,
      detail: `${totalDataGb.toFixed(3)} GB total data × network intensity by connection type`,
    },
    {
      layer: "data_centre",
      totalKwh: Math.round(dcKwh * 1000) / 1000,
      totalKgCO2e: Math.round(dcKgCO2e * 1000) / 1000,
      detail: `${totalDataGb.toFixed(3)} GB × ${dcKwhPerGb} kWh/GB × ${dataCentreGridFactor} kg CO2e/kWh`,
    },
  ];

  // --- Notes ---
  const notes: string[] = [];

  const deviceShare = (deviceKgCO2e / totalKgCO2e) * 100;
  if (deviceShare > 70) {
    notes.push(
      `End-user devices account for ${deviceShare.toFixed(0)}% of virtual emissions. ` +
        "Encouraging participants to use laptops over desktops, or turn off cameras when not presenting, " +
        "can meaningfully reduce this."
    );
  }

  if (quality === "hd" || quality === "full_hd") {
    const sdResult_kgCO2e_per_participant =
      (bitrateToGbPerHour(BITRATE_KBPS["sd"]) / bitrateToGbPerHour(bitrateKbps));
    notes.push(
      `Switching from ${quality} to SD quality would reduce network and data centre ` +
        `emissions by ~${((1 - sdResult_kgCO2e_per_participant) * 100).toFixed(0)}%. ` +
        "Device emissions (the largest share) are unaffected by quality."
    );
  }

  const mobileCount = segments
    .filter((s) => s.network !== "fixed")
    .reduce((sum, s) => sum + s.count, 0);
  if (mobileCount > input.participantCount * 0.3) {
    notes.push(
      `${mobileCount} participants (~${((mobileCount / input.participantCount) * 100).toFixed(0)}%) ` +
        "are on mobile networks. Mobile data transmission is 3–12× more energy-intensive than fixed " +
        "broadband per GB. Encouraging fixed/WiFi connections where possible reduces network layer emissions."
    );
  }

  notes.push(
    "Network energy intensity figures (Aslan et al. 2018 / IEA 2020) reflect 2022-era estimates. " +
      "Earlier figures (e.g. Shift Project 2019: 0.015 kWh/GB) have been revised significantly downward " +
      "and are no longer considered accurate for fixed broadband."
  );

  // Per-participant figure for comparison
  const kgPerParticipant = totalKgCO2e / input.participantCount;
  notes.push(
    `Per-participant footprint: ${kgPerParticipant.toFixed(3)} kg CO2e ` +
      `(${(kgPerParticipant * 1000).toFixed(1)} g CO2e per person for this event).`
  );

  const deviceProfileDesc =
    input.participantSegments
      ? "user-provided segment breakdown"
      : "default profile (60% laptop/fixed, 20% smartphone/4G, 15% desktop/fixed, 5% tablet/fixed)";

  return {
    totalKgCO2e: Math.round(totalKgCO2e * 1000) / 1000,
    totalKwh: Math.round(totalKwh * 1000) / 1000,
    totalDataGb: Math.round(totalDataGb * 1000) / 1000,
    byLayer,
    assumptions: {
      quality,
      bitrateKbps,
      participantGridFactor,
      dataCentreGridFactor,
      deviceProfile: deviceProfileDesc,
    },
    source:
      "Aslan et al. (2018) J. Industrial Ecology (network intensity); " +
      "IEA (2020) Data Centres and Data Transmission Networks (DC + mobile); " +
      "Malmodin & Lundén (2018) Sustainability (device power); " +
      "IEA Emissions Factors 2023 (Nigeria grid); IEA 2022 global average grid",
    notes,
  };
}