import { DreamEntry, MOODS, EMOTIONS } from './types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';

// ── Shared helpers ──

function moodLabel(value: string | null) {
  if (!value) return null;
  const m = MOODS.find(m => m.value === value);
  return m ? m.label : value;
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

// ── PDF Export (Premium Pattern) ──

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function getThemeBg(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [20, 20, 20] : [252, 252, 252];
}

function getAccent(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [120, 100, 220] : [100, 80, 200];
}

function getMuted(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [160, 160, 160] : [140, 140, 140];
}

function getWhite(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [235, 235, 235] : [255, 255, 255];
}

function getFg(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [235, 235, 235] : [31, 31, 31];
}

function fillPageBg(doc: jsPDF) {
  const bg = getThemeBg();
  doc.setFillColor(...bg);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function sanitize(text: string): string {
  return text
    .replace(/[😰😐😊😍🤯🌙💤✨🔮👁️‍🗨️🏷️📝]/gu, '')
    .replace(/★/g, '*')
    .replace(/☆/g, '-')
    .replace(/·/g, '|')
    .replace(/–/g, '-')
    .replace(/→/g, '->')
    .replace(/[„"]/g, '"')
    .replace(/[•●]/g, '-')
    .trim();
}

export function downloadPDF(entries: DreamEntry[]) {
  const accent = getAccent();
  const muted = getMuted();
  const white = getWhite();
  const fg = getFg();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  fillPageBg(doc);

  // Header bar
  doc.setFillColor(...accent);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Traumtagebuch', MARGIN, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const now = format(new Date(), 'dd.MM.yyyy');
  doc.text(`${entries.length} Eintraege | ${now}`, PAGE_W - MARGIN, 13, { align: 'right' });

  let y = 30;

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - 20) {
      doc.addPage();
      fillPageBg(doc);
      y = MARGIN;
    }
  };

  const groups = groupByDate(entries);

  for (const g of groups) {
    checkPage(30);

    // Date divider line
    doc.setDrawColor(...muted);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    // Date heading
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...fg);
    doc.text(sanitize(formatDate(g.date)), MARGIN, y);
    y += 8;

    for (const d of g.entries) {
      checkPage(35);

      // Dream title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...fg);
      doc.text(sanitize(d.title), MARGIN, y);
      y += 6;

      // Metadata line 1
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...muted);

      const meta1: string[] = [];
      if (d.mood) meta1.push(`Stimmung: ${moodLabel(d.mood)}`);
      if (d.vividness != null) meta1.push(`Lebendigkeit: ${d.vividness}/5`);
      if (d.sleep_quality != null) meta1.push(`Schlaf: ${d.sleep_quality}/5`);
      if (meta1.length) {
        doc.text(sanitize(meta1.join('  |  ')), MARGIN, y);
        y += 4.5;
      }

      // Metadata line 2
      const meta2: string[] = [];
      if (d.is_lucid) meta2.push('Luzid');
      if (d.is_recurring) meta2.push('Wiederkehrend');
      const emo = emotionLabels(d.emotions);
      if (emo) meta2.push(`Emotionen: ${emo}`);
      if (meta2.length) {
        doc.text(sanitize(meta2.join('  |  ')), MARGIN, y);
        y += 4.5;
      }

      // Tags
      if (d.tags && d.tags.length) {
        doc.text(sanitize(`Tags: ${d.tags.join(', ')}`), MARGIN, y);
        y += 4.5;
      }

      y += 2;

      // Content
      if (d.content) {
        doc.setFontSize(10);
        doc.setTextColor(...fg);
        const lines = doc.splitTextToSize(sanitize(d.content), CONTENT_W - 6);
        for (const line of lines) {
          checkPage(5);
          doc.text(line, MARGIN + 3, y);
          y += 4.5;
        }
      }

      y += 6;
    }
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy, HH:mm')} Uhr`, MARGIN, PAGE_H - 7);
    doc.text(`Seite ${i} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' });
  }

  doc.save(`traumtagebuch_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
