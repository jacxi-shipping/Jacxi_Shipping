import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAverageCompanyRateEstimate } from './shipping-rate-average';

describe('shipping rate average', () => {
  it('averages matching auction rows across company price lists', () => {
    const estimate = buildAverageCompanyRateEstimate([
      {
        companyId: 'company-1',
        companyName: 'Alpha Shipping',
        priceListId: 'list-1',
        priceListName: 'Alpha June',
        sourceFileName: 'alpha.pdf',
        config: {
          auctionRates: [
            { stateCode: 'CA', branch: 'Los Angeles', city: 'Los Angeles', total: 1000 },
            { stateCode: 'CA', branch: 'Sacramento', city: 'Sacramento', total: 1200 },
          ],
        },
      },
      {
        companyId: 'company-2',
        companyName: 'Beta Shipping',
        priceListId: 'list-2',
        priceListName: 'Beta June',
        sourceFileName: 'beta.pdf',
        config: {
          auctionRates: [
            { stateCode: 'CA', branch: 'Fremont', city: 'Fremont', total: 1400 },
          ],
        },
      },
    ], 'CA');

    assert.equal(estimate.averageBaseRate, 1250);
    assert.equal(estimate.companyCount, 2);
    assert.equal(estimate.matchedAuctionRows, 3);
    assert.deepEqual(estimate.sources.map((source) => source.baseRate), [1100, 1400]);
  });

  it('uses explicit state rates and ignores missing default-filled states', () => {
    const estimate = buildAverageCompanyRateEstimate([
      {
        companyId: 'company-1',
        companyName: 'Alpha Shipping',
        config: { stateRates: { TX: 900 } },
      },
      {
        companyId: 'company-2',
        companyName: 'Beta Shipping',
        config: { stateRates: { CA: 1500 } },
      },
    ], 'TX');

    assert.equal(estimate.averageBaseRate, 900);
    assert.equal(estimate.companyCount, 1);
    assert.equal(estimate.sources[0].companyName, 'Alpha Shipping');
  });

  it('returns null when no company has a real price for the state', () => {
    const estimate = buildAverageCompanyRateEstimate([
      {
        companyId: 'company-1',
        companyName: 'Alpha Shipping',
        config: { stateRates: { CA: 1500 } },
      },
    ], 'TX');

    assert.equal(estimate.averageBaseRate, null);
    assert.equal(estimate.companyCount, 0);
  });
});
