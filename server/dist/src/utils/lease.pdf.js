import PDFDocument from "pdfkit";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
/** Resolved once at import so a misconfigured UPLOAD_DIR fails loudly, not per request. */
const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? "src/uploads";
export const LEASE_DIRNAME = "lease-agreements";
export const leaseDir = path.isAbsolute(UPLOAD_ROOT)
    ? path.join(UPLOAD_ROOT, LEASE_DIRNAME)
    : path.join(process.cwd(), UPLOAD_ROOT, LEASE_DIRNAME);
const PAGE_MARGIN = 56;
const INK = "#1a202c";
const MUTED = "#5a6472";
const RULE = "#d7dce3";
const ACCENT = "#1d4ed8";
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const longDate = (value) => value.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
/**
 * Wraps text to an explicit width. PDFKit does not reflow on its own, so long
 * clauses are manually broken; without this a single long word or an unspaced
 * string can run past the right margin.
 */
const wrap = (doc, text, width, fontSize = 10) => {
    doc.fontSize(fontSize);
    return doc.text(text, PAGE_MARGIN, doc.y, { width, align: "left" });
};
const clause = (doc, heading, body, width) => {
    doc.moveDown(0.7);
    doc
        .fontSize(10.5)
        .fillColor(INK)
        .font("Helvetica-Bold")
        .text(heading, PAGE_MARGIN, doc.y, { width });
    doc.moveDown(0.2);
    doc.font("Helvetica").fillColor(INK);
    wrap(doc, body, width);
    doc.fillColor(INK);
};
const rule = (doc, y, width) => {
    doc
        .moveTo(PAGE_MARGIN, y)
        .lineTo(PAGE_MARGIN + width, y)
        .lineWidth(0.8)
        .strokeColor(RULE)
        .stroke();
};
const labelValue = (doc, label, value, x, y, w) => {
    doc.fontSize(8.5).fillColor(MUTED).font("Helvetica-Bold").text(label.toUpperCase(), x, y, { width: w });
    doc.fontSize(10.5).fillColor(INK).font("Helvetica").text(value, x, y + 13, { width: w });
};
const clauseBody = (d) => {
    const { monthlyRent, totalRent, securityDeposit, startDate, endDate, durationMonths } = d;
    return [
        [
            "1. Parties and Premises",
            `This Lease Agreement ("Agreement") is made between ${d.landlord.username} ("Landlord"), the owner of the property located at ${d.property.address || d.property.title}, and ${d.tenant.username} ("Tenant"). The Landlord leases to the Tenant the property known as "${d.property.title}", together with the fixtures and appurtenances now present on the premises.`,
        ],
        [
            "2. Term",
            `The tenancy begins on ${longDate(startDate)} and ends on ${longDate(endDate)}, a term of ${durationMonths} month${durationMonths === 1 ? "" : "s"}. The Agreement converts to a month-to-month tenancy only if both parties agree in writing; otherwise it expires at the end of the stated term unless renewed.`,
        ],
        [
            "3. Rent",
            `Tenant agrees to pay rent of ${money(monthlyRent)} per month, due in advance on the first day of each calendar month. Total rent for the stated term is ${money(totalRent)}. Rent shall be paid through the platform wallet associated with the Tenant's account. Any late payment shall accrue interest at the rate permitted by applicable law.`,
        ],
        [
            "4. Security Deposit",
            `Tenant has paid a security deposit of ${money(securityDeposit)} into an escrow account held by the platform. The deposit is held in escrow and is not the Landlord's property until the escrow is released. Upon release, the amount payable to the Landlord is the deposit less any platform service fee, and the balance is refunded to the Tenant. The deposit may be applied to unpaid rent or damage beyond ordinary wear and tear.`,
        ],
        [
            "5. Utilities and Charges",
            "Tenant is responsible for electricity, water, gas, internet, and any other utilities separately metered to the premises, unless the parties agree in writing otherwise. Landlord is responsible for building-level charges and property taxes.",
        ],
        [
            "6. Use of the Premises",
            "The premises shall be used solely as a private residence by the Tenant. Tenant shall not conduct any business that increases insurance risk, create a nuisance, or breach any applicable law or the building rules. Subletting or assigning this Agreement requires the Landlord's prior written consent.",
        ],
        [
            "7. Maintenance and Repairs",
            "Landlord shall maintain the premises in a habitable condition and remedy structural defects. Tenant shall keep the premises clean, report any damage or defect promptly, and not make alterations without the Landlord's written consent. Tenant is responsible for damage caused by the Tenant or the Tenant's guests.",
        ],
        [
            "8. Entry and Inspection",
            "Landlord may enter the premises with reasonable notice, and immediately in an emergency, to inspect, repair, or show the property. Landlord shall give Tenant at least 24 hours' notice for non-emergency entry.",
        ],
        [
            "9. Termination",
            "Either party may terminate with cause if the other party materially breaches this Agreement and fails to remedy the breach within 14 days of written notice. Tenant may terminate without cause by giving 30 days' written notice. On termination, Tenant shall return the premises in the condition it was received, ordinary wear and tear excepted.",
        ],
        [
            "10. Return of Deposit",
            "Within 14 days of the end of the term, Landlord shall inspect the premises and account for the security deposit. Amounts withheld shall be itemised in writing. Any dispute shall be raised through the platform before the escrow is settled.",
        ],
        [
            "11. Governing Law",
            "This Agreement is governed by the laws of the jurisdiction in which the property is located. If any provision is held unenforceable, the remaining provisions continue in full force.",
        ],
        [
            "12. Entire Agreement",
            "This document records the full terms agreed between the parties and supersedes prior discussions relating to this tenancy. Changes must be made in writing and signed by both parties.",
        ],
    ];
};
/**
 * Renders the agreement to `destination`. Streams to disk rather than buffering
 * the whole document, so a long lease does not sit in memory.
 */
export const writeLeaseAgreement = async (details, destination) => {
    // `bufferPages` is required: PDFKit otherwise flushes each page to the stream
    // as soon as it is full, after which `bufferedPageRange` reports only the
    // unflushed tail. Page footers need the true total to print "Page N of M".
    const doc = new PDFDocument({
        size: "A4",
        margin: PAGE_MARGIN,
        bufferPages: true,
        info: {
            Title: `Lease Agreement - ${details.property.title}`,
            Author: details.landlord.username,
            Subject: `Tenancy ${details.reference}`,
        },
    });
    const contentWidth = doc.page.width - PAGE_MARGIN * 2;
    // The pipeline promise is held rather than awaited here: `doc` is a readable
    // stream that only ends at `doc.end()` below, so awaiting now would deadlock.
    const streamed = pipeline(doc, fs.createWriteStream(destination));
    /* ─── Header ─── */
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("KMD PROPERTY RENTAL", { characterSpacing: 1.2 });
    doc
        .moveDown(0.2)
        .fontSize(20)
        .fillColor(INK)
        .font("Helvetica-Bold")
        .text("Residential Lease Agreement", { width: contentWidth });
    doc
        .fontSize(9.5)
        .fillColor(MUTED)
        .font("Helvetica")
        .text(`Reference ${details.reference}  ·  Generated ${longDate(details.generatedOn)}`, {
        width: contentWidth,
    });
    const headerBottom = doc.y + 10;
    rule(doc, headerBottom, contentWidth);
    doc.y = headerBottom + 16;
    /* ─── Parties ─── */
    doc.fontSize(9).fillColor(MUTED).font("Helvetica-Bold").text("PARTIES", { characterSpacing: 1 });
    const colWidth = (contentWidth - 24) / 2;
    const partiesTop = doc.y + 6;
    labelValue(doc, "Landlord", details.landlord.username, PAGE_MARGIN, partiesTop, colWidth);
    doc
        .fontSize(9)
        .fillColor(MUTED)
        .font("Helvetica")
        .text(details.landlord.email, PAGE_MARGIN, partiesTop + 30, { width: colWidth });
    labelValue(doc, "Tenant", details.tenant.username, PAGE_MARGIN + colWidth + 24, partiesTop, colWidth);
    doc
        .fontSize(9)
        .fillColor(MUTED)
        .font("Helvetica")
        .text(details.tenant.email, PAGE_MARGIN + colWidth + 24, partiesTop + 30, { width: colWidth });
    doc.y = partiesTop + 54;
    /* ─── Commercial summary ─── */
    doc
        .fontSize(9)
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .text("KEY TERMS", PAGE_MARGIN, doc.y, { characterSpacing: 1 });
    const termsTop = doc.y + 8;
    const termRows = [
        ["Property", details.property.title],
        ["Address", details.property.address || "—"],
        ["Lease term", `${details.durationMonths} month${details.durationMonths === 1 ? "" : "s"}`],
        ["Start date", longDate(details.startDate)],
        ["End date", longDate(details.endDate)],
        ["Monthly rent", money(details.monthlyRent)],
        ["Total rent", money(details.totalRent)],
        ["Security deposit", money(details.securityDeposit)],
    ];
    // Two columns of label/value pairs keeps the summary on one page.
    const rowGap = 34;
    const half = Math.ceil(termRows.length / 2);
    termRows.forEach(([label, value], index) => {
        const col = index < half ? 0 : 1;
        const row = index % half;
        const x = PAGE_MARGIN + col * (colWidth + 24);
        labelValue(doc, label, value, x, termsTop + row * rowGap, colWidth);
    });
    doc.y = termsTop + half * rowGap + 6;
    rule(doc, doc.y, contentWidth);
    doc.y += 14;
    /* ─── Clauses ─── */
    for (const [heading, body] of clauseBody(details)) {
        clause(doc, heading, body, contentWidth);
    }
    /* ─── Footer on every page ─── */
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i += 1) {
        doc.switchToPage(i);
        const footerY = doc.page.height - PAGE_MARGIN + 6;
        doc
            .fontSize(7.5)
            .fillColor(MUTED)
            .font("Helvetica")
            .text(`Lease reference ${details.reference}  ·  Page ${i + 1} of ${range.count}  ·  Generated by KMD Property Rental`, PAGE_MARGIN, footerY, { width: contentWidth, align: "center" });
    }
    doc.end();
    await streamed;
};
export const leaseFileNameFor = (rentRequestId) => `${rentRequestId}.pdf`;
