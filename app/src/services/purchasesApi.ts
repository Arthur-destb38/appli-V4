import { Platform } from 'react-native';

// Ce fichier n'importe JAMAIS react-native-purchases directement.
// Sur iOS/Android, on passe par purchasesApi.native.ts via le hook.
// Sur web, tout est stub (no-op).

export async function initPurchases(_userId: string): Promise<void> {}
export async function getOfferings(): Promise<any[]> { return []; }
export async function purchasePackage(_pkg: any): Promise<any> { throw new Error('Not available on web'); }
export async function restorePurchases(): Promise<any> { throw new Error('Not available on web'); }
export async function getCustomerInfo(): Promise<any> { throw new Error('Not available on web'); }
export function hasPremiumEntitlement(_info: any): boolean { return false; }
