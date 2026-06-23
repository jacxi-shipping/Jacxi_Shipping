import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { jsPDF } from 'jspdf';
import { extractAuctionRatesFromPdf } from './shipping-rate-pdf-import.ts';

describe('company price-list PDF parsing', () => {
  it('extracts auction lane rows from a generated PDF', async () => {
    const doc = new jsPDF({ unit: 'pt' });
    doc.text('CALIFORNIA(CA)', 60, 60);
    doc.text('Los Angeles Branch', 20, 90);
    doc.text('Los Angeles', 220, 90);
    doc.text('$1300', 500, 90);
    doc.text('TEXAS(TX)', 60, 130);
    doc.text('Houston Branch', 20, 160);
    doc.text('Houston', 220, 160);
    doc.text('$1250', 500, 160);

    const buffer = Buffer.from(doc.output('arraybuffer'));
    const result = await extractAuctionRatesFromPdf(buffer);

    assert.equal(result.entries.length, 2);
    assert.deepEqual(
      result.entries.map((entry) => ({ stateCode: entry.stateCode, total: entry.total })),
      [
        { stateCode: 'CA', total: 1300 },
        { stateCode: 'TX', total: 1250 },
      ],
    );
    assert.match(result.text, /CALIFORNIA/);
  });
});
