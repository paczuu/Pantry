// Warstwa zgodności ze starszym importem.
// Nowa logika wyszukiwania EAN znajduje się w ./barcode/lookupProductByBarcode.ts.

export { lookupProductByBarcode } from './barcode/lookupProductByBarcode.js';
export type { StandardProductInfo } from './barcode/types.js';
