// RevenueCat native implementation — DISABLED until react-native-purchases is installed.
// To enable:
//   1. pnpm add react-native-purchases
//   2. Add plugin to app.json: ["react-native-purchases", { "ios": { "usesStoreKit2": true } }]
//   3. Uncomment the real implementation below and remove the stubs
//   4. Set your API keys
//
// See MISE_EN_PLACE_MONETISATION.md for full setup instructions.

// Stubs — same as web version, until RevenueCat is configured
export async function initPurchases(_userId: string): Promise<void> {}
export async function getOfferings(): Promise<any[]> { return []; }
export async function purchasePackage(_pkg: any): Promise<any> { throw new Error('RevenueCat not configured yet'); }
export async function restorePurchases(): Promise<any> { throw new Error('RevenueCat not configured yet'); }
export async function getCustomerInfo(): Promise<any> { throw new Error('RevenueCat not configured yet'); }
export function hasPremiumEntitlement(_info: any): boolean { return false; }
