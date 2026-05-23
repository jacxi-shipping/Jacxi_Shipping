export type ImportedBankTransactionType = 'DEBIT' | 'CREDIT';

export interface ParsedBankOfAmericaTransaction {
  transactionDate: string;
  description: string;
  amount: number;
  type: ImportedBankTransactionType;
  reference?: string;
  notes?: string;
  rawRow: Record<string, string>;
}

const DATE_HEADERS = ['posteddate', 'date', 'transactiondate'];
const DESCRIPTION_HEADERS = ['description', 'payee', 'originaldescription', 'merchant', 'details'];
const SECONDARY_DESCRIPTION_HEADERS = ['memo', 'address', 'citystate', 'state'];
const REFERENCE_HEADERS = ['referencenumber', 'reference', 'checknumber', 'checkno'];
const SIGNED_AMOUNT_HEADERS = ['amount', 'transactionamount'];
const DEBIT_HEADERS = ['debit', 'withdrawal', 'withdrawals', 'moneyout'];
const CREDIT_HEADERS = ['credit', 'deposit', 'deposits', 'moneyin'];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const normalizedText = csvText.replace(/^\uFEFF/, '');

  for (let index = 0; index < normalizedText.length; index += 1) {
    const char = normalizedText[index];
    const nextChar = normalizedText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentCell);
      if (currentRow.some((value) => value.trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((value) => value.trim() !== '')) {
    rows.push(currentRow);
  }

  return rows;
}

function findColumnIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((header) => candidates.includes(header));
}

function sanitizeValue(value: string | undefined) {
  return value?.trim() || '';
}

function parseDate(value: string, rowNumber: number) {
  const sanitizedValue = sanitizeValue(value);
  if (!sanitizedValue) {
    throw new Error(`Row ${rowNumber}: missing transaction date`);
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(sanitizedValue)) {
    return sanitizedValue;
  }

  const slashMatch = sanitizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!slashMatch) {
    throw new Error(`Row ${rowNumber}: unsupported date format \"${sanitizedValue}\"`);
  }

  const [, monthText, dayText, yearText] = slashMatch;
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const year = Number.parseInt(yearText.length === 2 ? `20${yearText}` : yearText, 10);

  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) {
    throw new Error(`Row ${rowNumber}: invalid date \"${sanitizedValue}\"`);
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function parseSignedAmount(value: string, rowNumber: number) {
  const sanitizedValue = sanitizeValue(value);
  if (!sanitizedValue) {
    throw new Error(`Row ${rowNumber}: missing amount`);
  }

  const isNegativeByParens = sanitizedValue.startsWith('(') && sanitizedValue.endsWith(')');
  const normalizedNumber = sanitizedValue
    .replace(/[\$,]/g, '')
    .replace(/[()]/g, '')
    .trim();

  const amount = Number.parseFloat(normalizedNumber);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error(`Row ${rowNumber}: invalid amount \"${sanitizedValue}\"`);
  }

  if (isNegativeByParens) {
    return -Math.abs(amount);
  }

  return amount;
}

function buildDescription(primaryValues: string[], secondaryValues: string[]) {
  const primary = primaryValues.map(sanitizeValue).find(Boolean) || 'Bank transaction';
  const secondary = secondaryValues
    .map(sanitizeValue)
    .filter(Boolean)
    .filter((value) => value.toLowerCase() !== primary.toLowerCase());

  if (secondary.length === 0) {
    return { description: primary, notes: undefined as string | undefined };
  }

  return {
    description: primary,
    notes: secondary.join(' | '),
  };
}

export function parseBankOfAmericaCsv(csvText: string): ParsedBankOfAmericaTransaction[] {
  const rows = parseCsv(csvText);

  if (rows.length < 2) {
    throw new Error('CSV must include a header row and at least one transaction row');
  }

  const rawHeaders = rows[0].map((header) => sanitizeValue(header));
  const normalizedHeaders = rawHeaders.map(normalizeHeader);

  const dateIndex = findColumnIndex(normalizedHeaders, DATE_HEADERS);
  const amountIndex = findColumnIndex(normalizedHeaders, SIGNED_AMOUNT_HEADERS);
  const debitIndex = findColumnIndex(normalizedHeaders, DEBIT_HEADERS);
  const creditIndex = findColumnIndex(normalizedHeaders, CREDIT_HEADERS);

  if (dateIndex === -1) {
    throw new Error('CSV is missing a supported date column');
  }

  if (amountIndex === -1 && debitIndex === -1 && creditIndex === -1) {
    throw new Error('CSV is missing a supported amount column');
  }

  return rows.slice(1).map((row, index) => {
    const rowNumber = index + 2;
    const rawRow = rawHeaders.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
      accumulator[header] = sanitizeValue(row[headerIndex]);
      return accumulator;
    }, {});

    const transactionDate = parseDate(row[dateIndex], rowNumber);

    let signedAmount = 0;
    if (amountIndex !== -1 && sanitizeValue(row[amountIndex])) {
      signedAmount = parseSignedAmount(row[amountIndex], rowNumber);
    } else {
      const debitValue = debitIndex === -1 ? '' : sanitizeValue(row[debitIndex]);
      const creditValue = creditIndex === -1 ? '' : sanitizeValue(row[creditIndex]);

      if (!debitValue && !creditValue) {
        throw new Error(`Row ${rowNumber}: missing amount`);
      }

      if (debitValue) {
        signedAmount -= Math.abs(parseSignedAmount(debitValue, rowNumber));
      }

      if (creditValue) {
        signedAmount += Math.abs(parseSignedAmount(creditValue, rowNumber));
      }
    }

    const descriptionIndexes = normalizedHeaders
      .map((header, headerIndex) => ({ header, headerIndex }))
      .filter(({ header }) => DESCRIPTION_HEADERS.includes(header))
      .map(({ headerIndex }) => headerIndex);

    const secondaryDescriptionIndexes = normalizedHeaders
      .map((header, headerIndex) => ({ header, headerIndex }))
      .filter(({ header }) => SECONDARY_DESCRIPTION_HEADERS.includes(header))
      .map(({ headerIndex }) => headerIndex);

    const { description, notes } = buildDescription(
      descriptionIndexes.map((headerIndex) => row[headerIndex] || ''),
      secondaryDescriptionIndexes.map((headerIndex) => row[headerIndex] || '')
    );

    const referenceIndex = findColumnIndex(normalizedHeaders, REFERENCE_HEADERS);
    const reference = referenceIndex === -1 ? undefined : sanitizeValue(row[referenceIndex]) || undefined;

    return {
      transactionDate,
      description,
      amount: Math.abs(signedAmount),
      type: signedAmount >= 0 ? 'DEBIT' : 'CREDIT',
      reference,
      notes,
      rawRow,
    } satisfies ParsedBankOfAmericaTransaction;
  });
}