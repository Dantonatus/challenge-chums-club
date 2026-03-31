import { DreamEntry, MOODS, EMOTIONS } from './types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';

function moodLabel(value: string | null) {
  if (!value) return null;
  const m = MOODS.find(m => m.value === value);
  return m ? `${m.emoji} ${m.label}` : value;
}

function emotionLabels(values: string[] | null) {
  if (!values || values.length === 0) return null;
  return values.map(v => {
    const e = EMOTIONS.find(e => e.value === v);
    return e ? e.label : v;
  }).join(', ');
}

function stars(n: number | null, max = 5) {
  if (n == null) return null;
  return '★'.repeat(n) + '☆'.repeat(max - n);
}

function groupByDate(entries: DreamEntry[]) {
  const sorted = [...entries].sort((a, b) => b.entry_date.localeCompare(a.entry_date));
  const groups: { date: string; entries: DreamEntry[] }[] = [];
  for (const e of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.entry_date) {
      last.entries.push(e);
    } else {
      groups.push({ date: e.entry_date, entries: [e] });
    }
  }
  return groups;
}

function formatDate(dateStr: string) {
  return format(parseISO(dateStr), 'd. MMMM yyyy', { locale: de });
}

// ── Markdown Export ──

export function exportDreamsMarkdown(entries: DreamEntry[]): string {
  const lines: string[] = [];
  const now = format(new Date(), 'd. MMMM yyyy', { locale: de });
  lines.push(`# Traumtagebuch`);
  lines.push(`Exportiert am ${now} · ${entries.length} Träume`);
  lines.push('');

  const groups = groupByDate(entries);

  for (const g of groups) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${formatDate(g.date)}`);
    lines.push('');

    for (const d of g.entries) {
      lines.push(`### ${d.title} 🌙`);

      const meta: string[] = [];
      if (d.mood) meta.push(`**Stimmung:** ${moodLabel(d.mood)}`);
      if (d.vividness != null) meta.push(`**Lebendigkeit:** ${stars(d.vividness)}`);
      if (d.sleep_quality != null) meta.push(`**Schlaf:** ${stars(d.sleep_quality)}`);
      if (meta.length) lines.push(meta.join(' · '));

      const meta2: string[] = [];
      meta2.push(`**Luzid:** ${d.is_lucid ? 'Ja' : 'Nein'}`);
      meta2.push(`**Wiederkehrend:** ${d.is_recurring ? 'Ja' : 'Nein'}`);
      lines.push(meta2.join(' · '));

      const emo = emotionLabels(d.emotions);
      if (emo) lines.push(`**Emotionen:** ${emo}`);

      if (d.tags && d.tags.length) lines.push(`**Tags:** ${d.tags.join(', ')}`);

      lines.push('');
      if (d.content) {
        lines.push(`> ${d.content.replace(/\n/g, '\n> ')}`);
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

export function downloadMarkdown(entries: DreamEntry[]) {
  const md = exportDreamsMarkdown(entries);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `traumtagebuch_${format(new Date(), 'yyyy-MM-dd')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF Export ──

export function downloadPDF(entries: DreamEntry[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;
  let y = 25;

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Traumtagebuch', marginL, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120);
  const now = format(new Date(), 'd. MMMM yyyy', { locale: de });
  doc.text(`Exportiert am ${now} · ${entries.length} Träume`, marginL, y);
  doc.setTextColor(0);
  y += 12;

  const groups = groupByDate(entries);

  for (const g of groups) {
    checkPage(25);

    // Date header
    doc.setDrawColor(200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(formatDate(g.date), marginL, y);
    y += 8;

    for (const d of g.entries) {
      checkPage(30);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(d.title, marginL, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80);

      // Metadata line
      const metaParts: string[] = [];
      if (d.mood) metaParts.push(`Stimmung: ${moodLabel(d.mood)}`);
      if (d.vividness != null) metaParts.push(`Lebendigkeit: ${d.vividness}/5`);
      if (d.sleep_quality != null) metaParts.push(`Schlaf: ${d.sleep_quality}/5`);
      if (metaParts.length) {
        doc.text(metaParts.join('  ·  '), marginL, y);
        y += 4.5;
      }

      const meta2: string[] = [];
      if (d.is_lucid) meta2.push('Luzid');
      if (d.is_recurring) meta2.push('Wiederkehrend');
      const emo = emotionLabels(d.emotions);
      if (emo) meta2.push(`Emotionen: ${emo}`);
      if (meta2.length) {
        doc.text(meta2.join('  ·  '), marginL, y);
        y += 4.5;
      }

      if (d.tags && d.tags.length) {
        doc.text(`Tags: ${d.tags.join(', ')}`, marginL, y);
        y += 4.5;
      }

      doc.setTextColor(0);
      y += 2;

      // Content
      if (d.content) {
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(d.content, contentW - 5);
        for (const line of lines) {
          checkPage(6);
          doc.text(line, marginL + 3, y);
          y += 4.5;
        }
      }

      y += 6;
    }
  }

  doc.save(`traumtagebuch_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
