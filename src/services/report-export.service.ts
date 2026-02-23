import { eventService } from './event.service';

const escapeCsv = (value: string | number) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const buildSimplePdfBuffer = (lines: string[]) => {
  const text = lines.map((line) => line.replace(/[()\\]/g, '\\$&')).join('\\n');
  const stream = `BT /F1 12 Tf 40 780 Td (${text}) Tj ET`;
  const streamLength = Buffer.byteLength(stream, 'utf8');

  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${streamLength} >> stream\n${stream}\nendstream endobj`
  ];

  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];

  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    body += `${obj}\n`;
  });

  const xrefStart = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body, 'utf8');
};

export class ReportExportService {
  async exportByEventId(eventId: string, format: 'csv' | 'pdf') {
    const details = await eventService.getEventDetailsWithCalculatedCo2(eventId);

    if (format === 'csv') {
      const rows = [
        ['title', details.title],
        ['location', details.location],
        ['event_date', details.event_date],
        ['total_co2', details.total_co2],
        ['breakdown_energy', details.breakdown.energy],
        ['breakdown_travel', details.breakdown.travel],
        ['breakdown_catering', details.breakdown.catering],
        ['breakdown_waste', details.breakdown.waste]
      ];

      const content = rows.map(([key, value]) => `${escapeCsv(key)},${escapeCsv(value)}`).join('\n');
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `event-${eventId}-report.csv`,
        body: Buffer.from(content, 'utf8')
      };
    }

    const pdf = buildSimplePdfBuffer([
      `Event Emissions Report`,
      `Title: ${details.title}`,
      `Location: ${details.location}`,
      `Date: ${details.event_date}`,
      `Total CO2: ${details.total_co2}`,
      `Energy: ${details.breakdown.energy}`,
      `Travel: ${details.breakdown.travel}`,
      `Catering: ${details.breakdown.catering}`,
      `Waste: ${details.breakdown.waste}`
    ]);

    return {
      contentType: 'application/pdf',
      filename: `event-${eventId}-report.pdf`,
      body: pdf
    };
  }
}

export const reportExportService = new ReportExportService();
