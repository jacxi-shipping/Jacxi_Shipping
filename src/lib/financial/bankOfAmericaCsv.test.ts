import { describe, test } from 'node:test';
import assert from 'node:assert';
import { parseBankOfAmericaCsv } from './bankOfAmericaCsv.ts';

describe('parseBankOfAmericaCsv', () => {
  test('parses signed amount exports with common Bank of America columns', () => {
    const csv = [
      'Posted Date,Reference Number,Payee,Address,Amount',
      '05/01/2026,1234,ACH CREDIT ACME PAYROLL,NEW YORK NY,2500.50',
      '05/02/2026,9876,ONLINE PAYMENT CREDIT CARD,,(120.99)',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions.length, 2);
    assert.deepStrictEqual(transactions[0], {
      transactionDate: '2026-05-01',
      description: 'ACH CREDIT ACME PAYROLL',
      amount: 2500.5,
      type: 'DEBIT',
      reference: '1234',
      notes: 'NEW YORK NY',
      rawRow: {
        'Posted Date': '05/01/2026',
        'Reference Number': '1234',
        Payee: 'ACH CREDIT ACME PAYROLL',
        Address: 'NEW YORK NY',
        Amount: '2500.50',
      },
    });
    assert.strictEqual(transactions[1].type, 'CREDIT');
    assert.strictEqual(transactions[1].amount, 120.99);
  });

  test('parses debit and credit columns when amount is split', () => {
    const csv = [
      'Date,Description,Debit,Credit',
      '2026-05-03,Wire transfer fee,15.00,',
      '2026-05-04,Incoming wire,,300.00',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions[0].type, 'CREDIT');
    assert.strictEqual(transactions[0].amount, 15);
    assert.strictEqual(transactions[1].type, 'DEBIT');
    assert.strictEqual(transactions[1].amount, 300);
  });

  test('handles quoted fields with commas', () => {
    const csv = [
      'Posted Date,Description,Amount',
      '05/05/2026,"PAYMENT, CLIENT REF 88",100.00',
    ].join('\n');

    const transactions = parseBankOfAmericaCsv(csv);

    assert.strictEqual(transactions[0].description, 'PAYMENT, CLIENT REF 88');
  });

  test('throws for unsupported files', () => {
    assert.throws(
      () => parseBankOfAmericaCsv('Description,Amount\nNo date,50'),
      /supported date column/
    );
  });
});