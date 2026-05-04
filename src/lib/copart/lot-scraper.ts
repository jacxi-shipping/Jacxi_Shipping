type CopartDynamicLotDetails = {
  saleStatus?: string;
};

type CopartLotRawPayload = {
  lotNumberStr?: string;
  lcy?: number;
  mkn?: string;
  lm?: string;
  lmg?: string;
  fv?: string;
  clr?: string;
  dd?: string;
  bstl?: string;
  vehTypDesc?: string;
  tmtp?: string;
  egn?: string;
  cy?: string;
  yn?: string;
  locCity?: string;
  locState?: string;
  locCountry?: string;
  hk?: string;
  htsmn?: string;
  brand?: string;
  dynamicLotDetails?: CopartDynamicLotDetails;
};

export type CopartLotVehicleData = {
  lotNumber: string;
  auctionName: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleVIN?: string;
  vehicleColor?: string;
  vehicleType?: string;
  hasKey?: boolean;
  hasTitle?: boolean;
  purchaseLocation?: string;
  internalNotes?: string;
  copartUrl: string;
  source: 'copart-public-page';
  extracted: {
    bodyStyle?: string;
    damage?: string;
    transmission?: string;
    engine?: string;
    cylinders?: string;
    saleStatus?: string;
    yardName?: string;
  };
};

const COPART_LOT_URL = 'https://www.copart.com/lot';

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseYesNo(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === 'Y' || value === 'YES') {
    return true;
  }

  if (value === 'N' || value === 'NO') {
    return false;
  }

  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDescription?: string) {
  const source = `${bodyStyle || ''} ${vehicleTypeDescription || ''}`.toLowerCase();

  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility')) return 'suv';
  if (source.includes('van') || source.includes('cargo van')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan')) return 'sedan';
  if (source.includes('automobile')) return 'sedan';
  return undefined;
}

function buildLocation(raw: CopartLotRawPayload) {
  const detailedLocation = [raw.locCity, raw.locState, raw.locCountry]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(', ');

  return detailedLocation || normalizeValue(raw.yn);
}

function buildInternalNotes(raw: CopartLotRawPayload) {
  const details = [
    normalizeValue(raw.dd) ? `Damage: ${normalizeValue(raw.dd)}` : undefined,
    normalizeValue(raw.bstl) ? `Body style: ${normalizeValue(raw.bstl)}` : undefined,
    normalizeValue(raw.tmtp) ? `Transmission: ${normalizeValue(raw.tmtp)}` : undefined,
    normalizeValue(raw.egn) ? `Engine: ${normalizeValue(raw.egn)}` : undefined,
    normalizeValue(raw.cy) ? `Cylinders: ${normalizeValue(raw.cy)}` : undefined,
    normalizeValue(raw.dynamicLotDetails?.saleStatus)
      ? `Sale status: ${normalizeValue(raw.dynamicLotDetails?.saleStatus)}`
      : undefined,
    normalizeValue(raw.yn) ? `Yard: ${normalizeValue(raw.yn)}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

function extractLotPayload(html: string) {
  const match = html.match(/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) {
    throw new Error('Copart lot payload was not found on the public page.');
  }

  const rawJsonString = JSON.parse(`"${match[1]}"`) as string;
  return JSON.parse(rawJsonString) as CopartLotRawPayload;
}

export async function fetchCopartLotVehicleData(lotNumber: string): Promise<CopartLotVehicleData> {
  const normalizedLotNumber = normalizeValue(lotNumber);
  if (!normalizedLotNumber || !/^\d{5,12}$/.test(normalizedLotNumber)) {
    throw new Error('Copart lot numbers must be numeric.');
  }

  const copartUrl = `${COPART_LOT_URL}/${normalizedLotNumber}`;
  const response = await fetch(copartUrl, {
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Copart returned status ${response.status}.`);
  }

  const html = await response.text();
  const raw = extractLotPayload(html);

  return {
    lotNumber: normalizeValue(raw.lotNumberStr) || normalizedLotNumber,
    auctionName: normalizeValue(raw.brand) || 'Copart',
    vehicleMake: normalizeValue(raw.mkn),
    vehicleModel: normalizeValue(raw.lm) || normalizeValue(raw.lmg),
    vehicleYear: raw.lcy ? String(raw.lcy) : undefined,
    vehicleVIN: normalizeValue(raw.fv),
    vehicleColor: normalizeValue(raw.clr),
    vehicleType: inferVehicleType(normalizeValue(raw.bstl), normalizeValue(raw.vehTypDesc)),
    hasKey: parseYesNo(raw.hk),
    hasTitle: parseYesNo(raw.htsmn),
    purchaseLocation: buildLocation(raw),
    internalNotes: buildInternalNotes(raw),
    copartUrl,
    source: 'copart-public-page',
    extracted: {
      bodyStyle: normalizeValue(raw.bstl),
      damage: normalizeValue(raw.dd),
      transmission: normalizeValue(raw.tmtp),
      engine: normalizeValue(raw.egn),
      cylinders: normalizeValue(raw.cy),
      saleStatus: normalizeValue(raw.dynamicLotDetails?.saleStatus),
      yardName: normalizeValue(raw.yn),
    },
  };
}