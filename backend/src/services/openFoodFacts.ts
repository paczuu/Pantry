// Compatibility layer for legacy imports.
// New EAN lookup logic lives in ./barcode/lookupProductByBarcode.ts.

export { lookupProductByBarcode } from './barcode/lookupProductByBarcode.js';
export type { StandardProductInfo } from './barcode/types.js';
