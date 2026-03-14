const PS_URL = process.env.PS_API_URL;
const PS_KEY = process.env.PS_API_KEY;

function parseValue(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
  const m = xml.match(re);
  if (!m) return null;
  return (m[1] ?? m[2] ?? '').trim() || null;
}

function parseAll(xml, tag) {
  const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi');
  return [...xml.matchAll(re)].map(m => m[0]);
}

async function psGet(resource) {
  const separator = resource.includes('?') ? '&' : '?';
  const url = `${PS_URL}/${resource}${separator}ws_key=${PS_KEY}`;
  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PrestaShop API ${res.status}: ${text.slice(0, 300)}`);
  }

  return res.text();
}

export async function getOrderByReference(reference, email) {
  const listXml = await psGet(`orders?filter[reference]=${encodeURIComponent(reference)}&display=full`);

  const orderBlocks = parseAll(listXml, 'order');
  if (!orderBlocks.length) return null;

  const orderXml = orderBlocks[0];
  const idCustomer = parseValue(orderXml, 'id_customer');
  const idAddressDelivery = parseValue(orderXml, 'id_address_delivery');
  const orderRef = parseValue(orderXml, 'reference');

  if (!idCustomer || !idAddressDelivery) return null;

  const customerXml = await psGet(`customers/${idCustomer}`);
  const customerEmail = parseValue(customerXml, 'email');

  if (!customerEmail || customerEmail.toLowerCase() !== email.toLowerCase()) {
    return null;
  }

  const firstName = parseValue(customerXml, 'firstname');
  const lastName = parseValue(customerXml, 'lastname');

  const addressXml = await psGet(`addresses/${idAddressDelivery}`);
  const address1 = parseValue(addressXml, 'address1');
  const postcode = parseValue(addressXml, 'postcode');
  const city = parseValue(addressXml, 'city');
  const phone = parseValue(addressXml, 'phone') || parseValue(addressXml, 'phone_mobile');

  const rowBlocks = parseAll(orderXml, 'order_row');
  const items = rowBlocks.map(row => {
    const productId = parseValue(row, 'product_id');
    const productName = parseValue(row, 'product_name');
    const quantity = parseInt(parseValue(row, 'product_quantity') || '1');
    const price = parseFloat(parseValue(row, 'unit_price_tax_incl') || '0');

    const imgUrl = productId
  ? `${PS_URL.replace('/api', '')}/img/p/${productId.toString().split('').join('/')}/${productId}-large_default.jpg`
  : null;

    return {
      product_id: productId,
      product_name: productName,
      quantity,
      price: price.toFixed(2),
      imgUrl,
    };
  });

  return {
    order: { reference: orderRef },
    customer: {
      name: `${firstName} ${lastName}`.trim(),
      email: customerEmail,
      phone: phone || '',
      address: address1 || '',
      postal: postcode || '',
      city: city || '',
      iban: '',
    },
    items,
  };
}