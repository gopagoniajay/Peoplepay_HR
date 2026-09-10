const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const mdPath = path.resolve(__dirname, '../../PROJECT_DOCUMENTATION.md');
const outPdfPath = path.resolve(__dirname, '../../PROJECT_DOCUMENTATION.pdf');
const clientPublicPdfPath = path.resolve(__dirname, '../../client/public/PROJECT_DOCUMENTATION.pdf');

const markdownContent = fs.readFileSync(mdPath, 'utf8');

// Initialize PDF Document
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 45, right: 45 },
  bufferPages: true,
  autoFirstPage: true
});

const writeStream = fs.createWriteStream(outPdfPath);
doc.pipe(writeStream);

// Color Palette (Pastel & Modern Corporate)
const PRIMARY = '#3b82f6';
const PRIMARY_DARK = '#1e3a8a';
const SECONDARY = '#6366f1';
const TEXT_DARK = '#0f172a';
const TEXT_MUTED = '#475569';
const BORDER_COLOR = '#e2e8f0';
const BG_LIGHT = '#f8fafc';
const CODE_BG = '#f1f5f9';

const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;

// --- Document Cover / Header ---
doc.rect(doc.page.margins.left, 45, PAGE_WIDTH, 4).fill(SECONDARY);
doc.moveDown(0.8);

doc.font('Helvetica-Bold').fontSize(22).fillColor(PRIMARY_DARK)
   .text('PeoplePay360: Master Architectural Specification & System Guide', { align: 'left' });
doc.moveDown(0.3);

doc.font('Helvetica').fontSize(9).fillColor(TEXT_MUTED)
   .text('Enterprise Technical Reference & Stakeholder Briefing  |  Version 1.0.0 (Production-Ready)  |  https://github.com/Anvesh-999/PayPilot360');

doc.moveDown(0.5);
doc.strokeColor(BORDER_COLOR).lineWidth(0.8).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y).stroke();
doc.moveDown(1);

// Parser state
const lines = markdownContent.split('\n');
let inCodeBlock = false;
let codeBuffer = [];
let tableBuffer = [];
let inTable = false;

function flushCodeBlock() {
  if (codeBuffer.length === 0) return;
  const codeText = codeBuffer.join('\n');
  codeBuffer = [];

  const boxY = doc.y;
  const textHeight = doc.font('Courier').fontSize(7.5).heightOfString(codeText, { width: PAGE_WIDTH - 20 });
  
  if (doc.y + textHeight + 20 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  const curY = doc.y;
  doc.rect(doc.page.margins.left, curY, PAGE_WIDTH, textHeight + 14)
     .fillAndStroke(CODE_BG, BORDER_COLOR);

  doc.font('Courier').fontSize(7.5).fillColor('#1e293b')
     .text(codeText, doc.page.margins.left + 10, curY + 7, { width: PAGE_WIDTH - 20 });

  doc.y = curY + textHeight + 20;
}

function flushTable() {
  if (tableBuffer.length === 0) return;
  const rows = tableBuffer.map(r => r.trim().split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length));
  tableBuffer = [];

  // Filter out alignment divider row (e.g. ---|---|---)
  const contentRows = rows.filter(r => !r.every(cell => cell.match(/^[-:]+$/)));
  if (contentRows.length === 0) return;

  const colCount = Math.max(...contentRows.map(r => r.length));
  const colWidth = PAGE_WIDTH / colCount;
  const rowHeight = 18;

  if (doc.y + (contentRows.length * rowHeight) + 30 > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }

  contentRows.forEach((row, rowIdx) => {
    const isHeader = rowIdx === 0;
    const y = doc.y;

    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    doc.rect(doc.page.margins.left, doc.y, PAGE_WIDTH, rowHeight)
       .fillAndStroke(isHeader ? '#e2e8f0' : (rowIdx % 2 === 0 ? BG_LIGHT : '#ffffff'), BORDER_COLOR);

    row.forEach((cell, colIdx) => {
      doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(isHeader ? 8 : 7.5)
         .fillColor(isHeader ? PRIMARY_DARK : TEXT_DARK)
         .text(
           cell.replace(/\*\*/g, '').replace(/`/g, ''),
           doc.page.margins.left + (colIdx * colWidth) + 4,
           y + 5,
           { width: colWidth - 8, ellipsis: true }
         );
    });

    doc.y = y + rowHeight;
  });

  doc.moveDown(0.8);
}

// Process markdown line by line
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Code Block Fence
  if (line.startsWith('```')) {
    if (inCodeBlock) {
      inCodeBlock = false;
      flushCodeBlock();
    } else {
      if (inTable) { inTable = false; flushTable(); }
      inCodeBlock = true;
    }
    continue;
  }

  if (inCodeBlock) {
    codeBuffer.push(line);
    continue;
  }

  // Table row
  if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
    inTable = true;
    tableBuffer.push(line);
    continue;
  } else if (inTable) {
    inTable = false;
    flushTable();
  }

  // Blank lines
  if (!line.trim()) {
    doc.moveDown(0.35);
    continue;
  }

  // Horizontal Rule
  if (line.trim() === '---') {
    doc.moveDown(0.5);
    doc.strokeColor(BORDER_COLOR).lineWidth(0.5).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + PAGE_WIDTH, doc.y).stroke();
    doc.moveDown(0.5);
    continue;
  }

  // Check page bottom
  if (doc.y > doc.page.height - doc.page.margins.bottom - 45) {
    doc.addPage();
  }

  // Heading 1 (#)
  if (line.startsWith('# ')) {
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(16).fillColor(PRIMARY_DARK)
       .text(line.replace('# ', '').trim());
    doc.moveDown(0.4);
    continue;
  }

  // Heading 2 (##)
  if (line.startsWith('## ')) {
    doc.moveDown(0.7);
    const title = line.replace('## ', '').trim();
    doc.font('Helvetica-Bold').fontSize(13).fillColor(SECONDARY)
       .text(title);
    doc.moveDown(0.3);
    continue;
  }

  // Heading 3 (###)
  if (line.startsWith('### ')) {
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(10.5).fillColor(TEXT_DARK)
       .text(line.replace('### ', '').trim());
    doc.moveDown(0.2);
    continue;
  }

  // Heading 4 (####)
  if (line.startsWith('#### ')) {
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(TEXT_MUTED)
       .text(line.replace('#### ', '').trim());
    doc.moveDown(0.2);
    continue;
  }

  // Blockquote / Alert (> ...)
  if (line.startsWith('> ')) {
    const quoteText = line.replace(/^>\s*/, '').replace(/\[!(NOTE|IMPORTANT|TIP|WARNING)\]/g, '$1:').trim();
    const boxY = doc.y;
    const qHeight = doc.font('Helvetica-Oblique').fontSize(8.5).heightOfString(quoteText, { width: PAGE_WIDTH - 24 });
    doc.rect(doc.page.margins.left, boxY, PAGE_WIDTH, qHeight + 10).fill('#f0fdf4');
    doc.rect(doc.page.margins.left, boxY, 4, qHeight + 10).fill('#10b981');
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#065f46')
       .text(quoteText, doc.page.margins.left + 12, boxY + 5, { width: PAGE_WIDTH - 24 });
    doc.y = boxY + qHeight + 14;
    continue;
  }

  // Unordered list item (- or *)
  if (line.trim().match(/^[-*]\s+/)) {
    const cleanLine = line.trim().replace(/^[-*]\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
    const indent = (line.match(/^\s*/)[0].length / 2) * 10;
    doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK);
    doc.circle(doc.page.margins.left + 8 + indent, doc.y + 4.5, 1.8).fill(PRIMARY);
    doc.fillColor(TEXT_DARK).text(cleanLine, doc.page.margins.left + 16 + indent, doc.y, { width: PAGE_WIDTH - 16 - indent });
    doc.moveDown(0.15);
    continue;
  }

  // Ordered list item (1., 2., etc.)
  if (line.trim().match(/^\d+\.\s+/)) {
    const num = line.trim().match(/^(\d+\.)\s+/)[1];
    const cleanLine = line.trim().replace(/^\d+\.\s+/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(SECONDARY)
       .text(num, doc.page.margins.left + 4, doc.y, { width: 20, continued: true });
    doc.font('Helvetica').fillColor(TEXT_DARK).text('  ' + cleanLine, { width: PAGE_WIDTH - 24 });
    doc.moveDown(0.15);
    continue;
  }

  // Regular paragraph text
  const cleanPara = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/`(.*?)`/g, '$1');
  doc.font('Helvetica').fontSize(9).fillColor(TEXT_DARK)
     .text(cleanPara, { width: PAGE_WIDTH, lineGap: 1.5 });
  doc.moveDown(0.25);
}

// Flush any pending blocks
if (inCodeBlock) flushCodeBlock();
if (inTable) flushTable();

// Header and Footer on all pages
const range = doc.bufferedPageRange();
for (let i = 0; i < range.count; i++) {
  doc.switchToPage(i);

  // Top header (pages > 0)
  if (i > 0) {
    doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MUTED)
       .text('PeoplePay360 — Master Architectural Specification & System Guide', doc.page.margins.left, 25, { width: PAGE_WIDTH, align: 'right' });
    doc.strokeColor(BORDER_COLOR).lineWidth(0.5).moveTo(doc.page.margins.left, 36).lineTo(doc.page.margins.left + PAGE_WIDTH, 36).stroke();
  }

  // Bottom footer
  doc.strokeColor(BORDER_COLOR).lineWidth(0.5).moveTo(doc.page.margins.left, doc.page.height - 35).lineTo(doc.page.margins.left + PAGE_WIDTH, doc.page.height - 35).stroke();
  doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MUTED)
     .text('Confidential & Proprietary — For Internal Evaluation & Engineering Review Only', doc.page.margins.left, doc.page.height - 28, { width: PAGE_WIDTH * 0.65, align: 'left' });
  doc.text(`Page ${i + 1} of ${range.count}`, doc.page.margins.left, doc.page.height - 28, { width: PAGE_WIDTH, align: 'right' });
}

doc.end();

writeStream.on('finish', () => {
  console.log('PDF generated successfully at:', outPdfPath);
  try {
    fs.copyFileSync(outPdfPath, clientPublicPdfPath);
    console.log('PDF copied to client/public for instant download at:', clientPublicPdfPath);
  } catch (err) {
    console.error('Error copying to client/public:', err);
  }
});
