'use strict';

// Best-effort IP geolocation for the review/demo admin account's audit banner — shows
// which ISP/location a session came from. Free, keyless lookup; failures are swallowed
// since this is informational only, never a security control.
async function getIpGeoInfo(ip) {
  const cleanIp = String(ip || '').replace('::ffff:', '');
  if (!cleanIp || cleanIp === '::1' || cleanIp === '127.0.0.1') {
    return { ip: cleanIp, city: null, region: null, country: null, isp: null, local: true };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(cleanIp)}?fields=status,message,city,regionName,country,isp,org,query`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await res.json();
    if (data.status !== 'success') return { ip: cleanIp, city: null, region: null, country: null, isp: null };

    return {
      ip: data.query || cleanIp,
      city: data.city || null,
      region: data.regionName || null,
      country: data.country || null,
      isp: data.isp || data.org || null,
    };
  } catch {
    return { ip: cleanIp, city: null, region: null, country: null, isp: null };
  }
}

module.exports = { getIpGeoInfo };
