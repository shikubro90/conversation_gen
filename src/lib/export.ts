import type { ConversationOutput } from "./prompt";

type Messages = ConversationOutput["messages"];

// ─── Similarity ────────────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/\b\w+\b/g) ?? []);
}

function jaccardSimilarity(a: string, b: string): number {
  const sa = tokenize(a);
  const sb = tokenize(b);
  const inter = new Set([...sa].filter((t) => sb.has(t)));
  const union = new Set([...sa, ...sb]);
  return union.size === 0 ? 0 : inter.size / union.size;
}

export function isTooSimilar(current: Messages, previous: Messages[], threshold = 0.55): boolean {
  const cur = current.map((m) => m.text).join(" ");
  return previous.some((prev) => {
    const prv = prev.map((m) => m.text).join(" ");
    return jaccardSimilarity(cur, prv) >= threshold;
  });
}

// ─── Plain text ────────────────────────────────────────────────────────────────

export function toPlainText(data: ConversationOutput): string {
  const lines: string[] = [
    "CONVERSATION",
    "============",
    "",
    ...data.messages.flatMap((m) => [
      `${m.role === "buyer" ? "Buyer" : "Seller"}:`,
      m.text,
      "",
    ]),
    "CUSTOM OFFER",
    "============",
    data.customOffer.title,
    `Price: ${data.customOffer.price}`,
    `Delivery: ${data.customOffer.delivery}`,
    `Revisions: ${data.customOffer.revisions}`,
    "",
    "Includes:",
    ...data.customOffer.includes.map((i) => `  - ${i}`),
    "",
    "REQUIREMENTS",
    "============",
    ...data.requirements.map((r, i) => `${i + 1}. ${r}`),
  ];
  return lines.join("\n");
}

export function downloadTxt(data: ConversationOutput) {
  const blob = new Blob([toPlainText(data)], { type: "text/plain" });
  trigger(blob, `conversation-${slug(data.topic)}.txt`);
}

// ─── DOCX ─────────────────────────────────────────────────────────────────────

export async function downloadDocx(data: ConversationOutput) {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } = await import("docx");

  const sectionHeading = (text: string) =>
    new Paragraph({
      text,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
    });

  // Each message: colored label on its own line, then text on next line, then gap
  const messageParagraphs = (m: { role: "buyer" | "seller"; text: string }) => {
    const isBuyer = m.role === "buyer";
    return [
      // Label line — colored
      new Paragraph({
        children: [
          new TextRun({
            text: isBuyer ? "Buyer" : "Seller",
            bold: true,
            size: 22,
            color: isBuyer ? "CC0000" : "1A7A1A", // red for buyer, green for seller
          }),
        ],
        spacing: { before: 240, after: 60 },
      }),
      // Message text — black
      new Paragraph({
        children: [
          new TextRun({
            text: m.text,
            size: 22,
            color: "000000",
          }),
        ],
        spacing: { after: 160 },
      }),
    ];
  };

  const offerLine = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, size: 22, color: "000000" })],
      spacing: { after: 120 },
    });

  const bulletLine = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: `- ${text}`, size: 22, color: "000000" })],
      spacing: { after: 100 },
      indent: { left: 300 },
    });

  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          children: [
            new TextRun({
              text: data.customOffer.title || `${data.service} — ${data.topic}`,
              bold: true,
              size: 32,
              color: "1A1A1A",
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
          alignment: AlignmentType.CENTER,
        }),

        // Conversation
        sectionHeading("Conversation"),
        ...data.messages.flatMap(messageParagraphs),

        // Custom Offer
        sectionHeading("Custom Offer"),
        offerLine(data.customOffer.title),
        offerLine(`Price: ${data.customOffer.price}   |   Delivery: ${data.customOffer.delivery}   |   Revisions: ${data.customOffer.revisions}`),
        new Paragraph({ children: [new TextRun({ text: "Includes:", bold: true, size: 22 })], spacing: { before: 160, after: 80 } }),
        ...data.customOffer.includes.map(bulletLine),

        // Requirements
        sectionHeading("Requirements from Buyer"),
        ...data.requirements.map((r, i) => offerLine(`${i + 1}. ${r}`)),
      ],
    }],
  });

  const buf = await Packer.toBlob(doc);
  trigger(buf, `conversation-${slug(data.topic)}.docx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function downloadPdf(data: ConversationOutput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const margin = 50;
  const maxW = W - margin * 2;
  let y = 60;

  const checkPage = (needed = 20) => {
    if (y + needed > 800) { doc.addPage(); y = 50; }
  };

  const nl = (space: number) => { y += space; };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(26, 26, 26);
  const title = data.customOffer.title || `${data.service} — ${data.topic}`;
  const titleLines = doc.splitTextToSize(title, maxW);
  titleLines.forEach((line: string) => { checkPage(24); doc.text(line, W / 2, y, { align: "center" }); nl(26); });
  nl(16);

  // Section heading helper
  const sectionHeading = (text: string) => {
    nl(10);
    checkPage(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text(text, margin, y);
    nl(6);
    // underline
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, y, W - margin, y);
    nl(18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
  };

  // Conversation
  sectionHeading("Conversation");

  data.messages.forEach((m) => {
    const isBuyer = m.role === "buyer";
    const label = isBuyer ? "Buyer" : "Seller";

    // Gap before each message
    nl(10);
    checkPage(40);

    // Colored label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    if (isBuyer) {
      doc.setTextColor(180, 0, 0); // red
    } else {
      doc.setTextColor(20, 120, 20); // green
    }
    doc.text(label, margin, y);
    nl(16);

    // Message text — black
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(m.text, maxW);
    lines.forEach((line: string) => { checkPage(14); doc.text(line, margin, y); nl(15); });
    nl(6);
  });

  // Custom Offer
  sectionHeading("Custom Offer");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(20, 20, 20);
  const offerTitleLines = doc.splitTextToSize(data.customOffer.title, maxW);
  offerTitleLines.forEach((line: string) => { checkPage(14); doc.text(line, margin, y); nl(15); });
  nl(6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(`Price: ${data.customOffer.price}   |   Delivery: ${data.customOffer.delivery}   |   Revisions: ${data.customOffer.revisions}`, margin, y);
  nl(18);

  doc.setFont("helvetica", "bold");
  doc.text("Includes:", margin, y);
  nl(16);
  doc.setFont("helvetica", "normal");
  data.customOffer.includes.forEach((item) => {
    const lines = doc.splitTextToSize(`- ${item}`, maxW - 16);
    lines.forEach((line: string) => { checkPage(14); doc.text(line, margin + 16, y); nl(15); });
  });

  // Requirements
  nl(10);
  sectionHeading("Requirements from Buyer");
  data.requirements.forEach((r, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${r}`, maxW);
    lines.forEach((line: string) => { checkPage(14); doc.text(line, margin, y); nl(15); });
    nl(4);
  });

  doc.save(`conversation-${slug(data.topic)}.pdf`);
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function slug(s: string) {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 40);
}

function trigger(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
