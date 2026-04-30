# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: shipment-lifecycle.spec.ts >> walks the main shipment lifecycle UI from dispatch assignment to transit assignment
- Location: tests\e2e\shipment-lifecycle.spec.ts:225:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://172.20.10.3:3001/dashboard/shipments/shipment-1
Call log:
  - navigating to "http://172.20.10.3:3001/dashboard/shipments/shipment-1", waiting until "load"

```

# Test source

```ts
  196 |       referenceNumber: transitReference,
  197 |       origin: 'Dubai',
  198 |       destination: 'Kabul',
  199 |       status: 'IN_TRANSIT',
  200 |       company: { id: 'transit-co', name: 'Transit Co' },
  201 |     };
  202 |   }
  203 | 
  204 |   return baseShipment;
  205 | }
  206 | 
  207 | async function mockAuthenticatedSession(page: Page) {
  208 |   await page.route('**/api/auth/session**', async (route) => {
  209 |     await json(route, {
  210 |       user: {
  211 |         id: 'admin-1',
  212 |         name: 'Admin User',
  213 |         email: 'admin@example.com',
  214 |         role: 'admin',
  215 |       },
  216 |       expires: '2099-01-01T00:00:00.000Z',
  217 |     });
  218 |   });
  219 | 
  220 |   await page.route('**/api/auth/_log**', async (route) => {
  221 |     await json(route, { ok: true });
  222 |   });
  223 | }
  224 | 
  225 | test('walks the main shipment lifecycle UI from dispatch assignment to transit assignment', async ({ page }) => {
  226 |   const state: WorkflowState = {
  227 |     phase: 'on-hand',
  228 |     releaseToken: null,
  229 |     releaseTokenCreatedAt: null,
  230 |   };
  231 | 
  232 |   await mockAuthenticatedSession(page);
  233 | 
  234 |   await page.route(`**/api/shipments/${shipmentId}`, async (route) => {
  235 |     if (route.request().method() !== 'GET') {
  236 |       await json(route, { message: 'Unsupported request' }, 405);
  237 |       return;
  238 |     }
  239 | 
  240 |     await json(route, { shipment: buildShipment(state) });
  241 |   });
  242 | 
  243 |   await page.route('**/api/dispatches', async (route) => {
  244 |     await json(route, {
  245 |       dispatches: [
  246 |         {
  247 |           id: dispatchId,
  248 |           referenceNumber: dispatchReference,
  249 |           origin: 'Houston Yard',
  250 |           destination: 'Port of Loading',
  251 |           status: 'PENDING',
  252 |           company: { name: 'Dispatch Co' },
  253 |         },
  254 |       ],
  255 |     });
  256 |   });
  257 | 
  258 |   await page.route(`**/api/dispatches/${dispatchId}/shipments`, async (route) => {
  259 |     if (route.request().method() !== 'POST') {
  260 |       await json(route, { error: 'Unsupported request' }, 405);
  261 |       return;
  262 |     }
  263 | 
  264 |     state.phase = 'dispatching';
  265 |     await json(route, { shipment: buildShipment(state) });
  266 |   });
  267 | 
  268 |   await page.route(`**/api/shipments/${shipmentId}/release-token`, async (route) => {
  269 |     state.releaseToken = 'REL-TEST-TOKEN';
  270 |     state.releaseTokenCreatedAt = '2026-04-04T12:00:00.000Z';
  271 |     await json(route, {
  272 |       shipment: {
  273 |         id: shipmentId,
  274 |         releaseToken: state.releaseToken,
  275 |         releaseTokenCreatedAt: state.releaseTokenCreatedAt,
  276 |       },
  277 |     });
  278 |   });
  279 | 
  280 |   await page.route('**/api/transits/*/shipments', async (route) => {
  281 |     if (route.request().method() !== 'POST') {
  282 |       await json(route, { error: 'Unsupported request' }, 405);
  283 |       return;
  284 |     }
  285 | 
  286 |     const body = route.request().postDataJSON() as { shipmentId?: string; releaseToken?: string };
  287 |     if (body.shipmentId !== shipmentId || body.releaseToken !== state.releaseToken) {
  288 |       await json(route, { error: 'Invalid release token for this shipment' }, 400);
  289 |       return;
  290 |     }
  291 | 
  292 |     state.phase = 'transit';
  293 |     await json(route, { shipment: buildShipment(state) });
  294 |   });
  295 | 
> 296 |   await page.goto(`/dashboard/shipments/${shipmentId}`);
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://172.20.10.3:3001/dashboard/shipments/shipment-1
  297 | 
  298 |   await expect(page.getByRole('heading', { name: 'VIN-WORKFLOW-1' })).toBeVisible();
  299 |   await expect(page.getByText('Assign to Dispatch')).toBeVisible();
  300 |   await expect(page.getByText('No transit assigned. Transit can be assigned only after shipment release.')).toBeVisible();
  301 | 
  302 |   await page.getByRole('button', { name: 'Assign to Dispatch' }).click();
  303 |   const dispatchDialog = page.getByRole('dialog', { name: 'Assign Shipment to Dispatch' });
  304 |   await expect(dispatchDialog).toBeVisible();
  305 |   await dispatchDialog.getByLabel('Dispatch').click();
  306 |   await page.getByRole('option', { name: /DSP-2026-AAA11/ }).click();
  307 |   await dispatchDialog.getByRole('button', { name: 'Assign' }).click();
  308 | 
  309 |   await expect(page.getByText('Ref:')).toBeVisible();
  310 |   await expect(page.getByText(dispatchReference)).toBeVisible();
  311 |   await expect(page.getByRole('button', { name: 'Assign to Dispatch' })).toHaveCount(0);
  312 |   await expect(page.getByText('Remove from dispatch')).toBeVisible();
  313 | 
  314 |   state.phase = 'released';
  315 |   await page.reload();
  316 | 
  317 |   await expect(page.getByText(containerNumber)).toBeVisible();
  318 |   await expect(page.getByRole('button', { name: 'Generate Token' })).toBeVisible();
  319 |   await expect(page.getByRole('button', { name: 'Assign to Transit' })).toBeEnabled();
  320 | 
  321 |   await page.getByRole('button', { name: 'Generate Token' }).click();
  322 |   await expect(page.getByRole('button', { name: 'Release Token PDF' })).toBeVisible();
  323 | 
  324 |   await page.getByRole('button', { name: 'Assign to Transit' }).click();
  325 |   const transitDialog = page.getByRole('dialog', { name: 'Assign Shipment to Transit' });
  326 |   await expect(transitDialog).toBeVisible();
  327 |   await transitDialog.getByLabel('Transit ID').fill(transitId);
  328 |   await transitDialog.getByLabel('Release Token').fill(state.releaseToken ?? '');
  329 |   await transitDialog.getByRole('button', { name: 'Assign' }).click();
  330 | 
  331 |   await expect(page.getByText(transitReference)).toBeVisible();
  332 |   await expect(page.getByText('Remove from transit')).toBeVisible();
  333 |   await expect(page.getByRole('button', { name: 'Transit Expense' })).toBeEnabled();
  334 | });
```