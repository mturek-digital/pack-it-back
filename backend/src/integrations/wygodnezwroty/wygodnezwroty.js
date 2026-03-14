function generateMockWaybill() {
  const carriers = ['DPD', 'DHL', 'INPOST', 'GLS', 'FEDEX'];
  const carrier = carriers[Math.floor(Math.random() * carriers.length)];
  const number = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `${carrier}${number}`;
}

function generateMockTrackingUrl(waybill) {
  if (waybill.startsWith('DPD'))    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${waybill}`;
  if (waybill.startsWith('DHL'))    return `https://www.dhl.com/pl-pl/home/tracking.html?tracking-id=${waybill}`;
  if (waybill.startsWith('INPOST')) return `https://inpost.pl/sledzenie-przesylek?number=${waybill}`;
  if (waybill.startsWith('GLS'))    return `https://gls-group.eu/track/${waybill}`;
  return `https://wygodnezwroty.pl/track/${waybill}`;
}

export async function fetchWaybillByRMA(rmaNumber) {
  await new Promise(r => setTimeout(r, 120));
  const hasWaybill = Math.random() > 0.3;
  if (!hasWaybill) return null;
  const waybill = generateMockWaybill();
  return {
    waybill,
    carrier:     waybill.split(/[0-9]/)[0],
    trackingUrl: generateMockTrackingUrl(waybill),
    status:      'LABEL_CREATED',
    createdAt:   new Date().toISOString(),
  };
}

export async function fetchPendingWaybills(pendingReturns) {
  await new Promise(r => setTimeout(r, 200));
  return pendingReturns
    .filter(() => Math.random() > 0.4)
    .map(ret => {
      const waybill = generateMockWaybill();
      return {
        rmaNumber:   ret.internal_return_no,
        waybill,
        carrier:     waybill.split(/[0-9]/)[0],
        trackingUrl: generateMockTrackingUrl(waybill),
      };
    });
}