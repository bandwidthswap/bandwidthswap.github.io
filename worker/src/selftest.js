// Proves Ed25519 works where the Worker runs, on every GET /, posting nothing: the kit's link announcement vector
// (spec/vectors/link.json, a test-only key) verified under its relay with the domain string of the kit's
// spec/PROTOCOL.md Section 7. PLAN.md Section 4 asks P1 to prove this on a deploy before anything is built on it.
import * as bsp from '../../docs/bsp.js';

const LINK_DOMAIN = 'bandwidthswap/link/v1';
const enc = new TextEncoder();

// spec/vectors/link.json as the kit writes it (the first announcement: any payer, 10% margin, since T0 + 3600).
export const LINK_VECTOR = `{
 "carry": 0,
 "clock_tolerance_s": 5,
 "contact_plan": null,
 "domain": "ed25519:ZSkFPo6PQCl9IKHZpRXT7zp_1vBFqEcpwW0Zucj1Wsg",
 "kind": "link",
 "light_time_s": 0,
 "margin": 0.1,
 "medium": "wifi",
 "min_bytes": 65536,
 "patience_windows": 2,
 "payer": "*",
 "price": 0.1,
 "proto": 1,
 "range_class": "building",
 "receipt_lifetime_s": null,
 "relay": "ed25519:7NXLckho5kxw7Bht2Dcjv_v4-ShUgY1sAdYX3V0RVec",
 "sig": "ENR2th2poXQTfLO99t2QDpqAq2VnEDhgs7ZiCPGJn5v7RLev1XK_VjUrh9riiTdHJFLZSfQBLCUvoRSylk1KAQ",
 "sig_scheme": "ed25519",
 "since": 1800003600,
 "unit": "USD/GB",
 "window": "hour"
}`;

export async function ed25519Ok() {
  try {
    const rec = bsp.parse(LINK_VECTOR);
    const sig = bsp.unb64u(rec.sig);
    delete rec.sig;
    return await bsp.verifySignature(bsp.pubOfNym(rec.relay), enc.encode(LINK_DOMAIN + '\n' + bsp.canon(rec)), sig);
  } catch (e) {
    return false;
  }
}
