import PDFDocument from 'pdfkit';
import { EventDetailsResponse } from '../types/events';
import { eventService } from './event.service';

const escapeCsv = (value: string | number | boolean) => {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const COL = {
  header: '#1565C0',
  cardBg: '#E3F2FD',
  totalText: '#0D47A1',
  muted: '#546E7A',
  border: '#B0BEC5',
  rowAlt: '#F5F9FC'
};

const CATEGORY_COLORS: Record<string, string> = {
  Travel: '#6A1B9A',
  Accommodation: '#00838F',
  Catering: '#C62828',
  Energy: '#FF8F00',
  Waste: '#2E7D32',
  Streaming: '#1565C0'
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);

function formatLabelFromPlan(format: string): string {
  if (format === 'in_person') return 'In person';
  if (format === 'hybrid') return 'Hybrid';
  if (format === 'virtual') return 'Virtual';
  return format.replace(/_/g, ' ');
}

function buildEventReportPdf(d: EventDetailsResponse): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: 'Event emissions report' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const margin = 48;
    const innerW = pageW - margin * 2;

    const { breakdown, total } = d.estimate;
    const parts = [
      { label: 'Travel', value: breakdown.travel },
      { label: 'Accommodation', value: breakdown.accommodation },
      { label: 'Catering', value: breakdown.catering },
      { label: 'Energy', value: breakdown.energy },
      { label: 'Waste', value: breakdown.waste },
      { label: 'Streaming', value: breakdown.streaming }
    ].filter((p) => p.value > 0);
    const safeTotal = total > 0 ? total : 1;

    const people = (d.plan.attendance ?? 0) + (d.plan.online_attendance ?? 0);
    const formatLabel = formatLabelFromPlan(d.plan.format);

    const topR = 14;
    const topBandH = 66;
    doc.roundedRect(margin, 18, innerW, topBandH, topR).fill(COL.header);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(12).text('ECO EVENT TRACKER', margin + 18, 38);
    doc.font('Helvetica').fontSize(9).opacity(0.92).text('Emissions report', margin + 18, 56);
    doc.opacity(1);
    doc.fillColor('#E3F2FD').fontSize(9).text(
      new Date().toLocaleDateString('en-US', { dateStyle: 'medium' }),
      margin + innerW - 138,
      42,
      { width: 120, align: 'right' }
    );

    const bodyTop = 18 + topBandH + 22;
    doc.fillColor('#212121').font('Helvetica-Bold').fontSize(20).text(d.title, margin, bodyTop, { width: innerW });
    doc.font('Helvetica').fontSize(10).fillColor(COL.muted);
    doc.text(
      `${d.event_date}  ·  ${d.location}  ·  ${people} attendees  ·  ${formatLabel}`,
      margin,
      bodyTop + 26,
      { width: innerW }
    );

    const cardY = bodyTop + 52;
    const cardR = 12;
    doc.roundedRect(margin, cardY, innerW, 82, cardR).fillAndStroke(COL.cardBg, COL.border);
    doc.fillColor(COL.totalText).font('Helvetica').fontSize(10).text('Estimated total CO₂e', margin + 18, cardY + 16);
    doc.font('Helvetica-Bold').fontSize(30).text(`${fmt(total)} kg`, margin + 18, cardY + 34);

    const sectionTitleY = cardY + 98;
    doc.fillColor('#212121').font('Helvetica-Bold').fontSize(13).text('Breakdown by category', margin, sectionTitleY);

    const pad = 14;
    const gap = 10;
    const wKg = 78;
    const wShare = 50;
    const tableInnerW = innerW - pad * 2;
    const wBar = 128;
    const wCat = tableInnerW - gap * 3 - wKg - wShare - wBar;
    const x0 = margin + pad;
    const xCat = x0;
    const xKg = xCat + wCat + gap;
    const xShare = xKg + wKg + gap;
    const xBar = xShare + wShare + gap;

    const headerH = 28;
    const rowH = 30;
    const tableR = 12;
    const tableTop = sectionTitleY + 22;
    const numRows = parts.length;
    const tableH = headerH + numRows * rowH + 10;

    doc.roundedRect(margin, tableTop, innerW, tableH, tableR).fill('#FFFFFF');
    doc.roundedRect(margin, tableTop, innerW, tableH, tableR).stroke(COL.border);
    doc.rect(margin + 2, tableTop + 2, innerW - 4, headerH - 2).fill('#ECEFF1');

    const fsH = 9;
    const fsB = 10;
    const yHeader = tableTop + 9;
    doc.font('Helvetica-Bold').fontSize(fsH).fillColor(COL.muted);
    doc.text('Category', xCat, yHeader, { width: wCat, align: 'left' });
    doc.text('kg CO₂e', xKg, yHeader, { width: wKg, align: 'right' });
    doc.text('Share', xShare, yHeader, { width: wShare, align: 'right' });
    doc.text('Mix', xBar, yHeader, { width: wBar, align: 'left' });

    let y = tableTop + headerH + 6;

    parts.forEach((p, i) => {
      const rowTop = y - 5;
      if (i % 2 === 1) {
        doc.rect(margin + 2, rowTop, innerW - 4, rowH).fill(COL.rowAlt);
      }

      const pct = (p.value / safeTotal) * 100;
      const barH = 12;
      const barY = y + 4;

      doc.fillColor('#212121').font('Helvetica').fontSize(fsB).text(p.label, xCat, y, { width: wCat, align: 'left' });
      doc.text(fmt(p.value), xKg, y, { width: wKg, align: 'right' });
      doc.fillColor(COL.muted).font('Helvetica').fontSize(fsB).text(`${fmt(pct)}%`, xShare, y, { width: wShare, align: 'right' });

      const bw = Math.max(0, (p.value / safeTotal) * wBar);
      doc.roundedRect(xBar, barY, wBar, barH, 6).fill('#ECEFF1');
      if (bw > 0.5) {
        doc.roundedRect(xBar, barY, bw, barH, 6).fill(CATEGORY_COLORS[p.label] || COL.header);
      }

      y += rowH;
    });

    y = tableTop + tableH + 12;
    doc.font('Helvetica').fontSize(8).fillColor(COL.muted).text(
      'Figures are decision-grade estimates from your inputs (DEFRA 2024, IEA, peer-reviewed factors).',
      margin,
      y,
      { width: innerW, align: 'center' }
    );

    doc.end();
  });
}

export class ReportExportService {
  async exportByEventId(eventId: string, format: 'csv' | 'pdf') {
    const details = await eventService.getEventDetails(eventId);
    const { breakdown, total } = details.estimate;

    if (format === 'csv') {
      const rows: Array<[string, string | number | boolean]> = [
        ['title', details.title],
        ['location', details.location],
        ['event_date', details.event_date],
        ['format', details.plan.format],
        ['attendance', details.plan.attendance ?? 0],
        ['online_attendance', details.plan.online_attendance ?? 0],
        ['days', details.plan.days ?? 1],
        ['total_co2', total],
        ['breakdown_travel', breakdown.travel],
        ['breakdown_accommodation', breakdown.accommodation],
        ['breakdown_catering', breakdown.catering],
        ['breakdown_energy', breakdown.energy],
        ['breakdown_waste', breakdown.waste],
        ['breakdown_streaming', breakdown.streaming]
      ];

      const content = rows.map(([key, value]) => `${escapeCsv(key)},${escapeCsv(value)}`).join('\n');
      return {
        contentType: 'text/csv; charset=utf-8',
        filename: `event-${eventId}-report.csv`,
        body: Buffer.from(content, 'utf8')
      };
    }

    const pdf = await buildEventReportPdf(details);

    return {
      contentType: 'application/pdf',
      filename: `event-${eventId}-report.pdf`,
      body: pdf
    };
  }
}

export const reportExportService = new ReportExportService();
