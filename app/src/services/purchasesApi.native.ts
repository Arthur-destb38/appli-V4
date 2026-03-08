import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';

const REVENUECAT_IOS_KEY = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const REVENUECAT_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';

let initialized = false;

export async function initPurchases(userId: string): Promise<void> {
  if (initialized) return;
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY;
  Purchases.configure({ apiKey });
  await Purchases.logIn(userId);
  initialized = true;
}

export async function getOfferings(): Promise<any[]> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}

export async function purchasePackage(pkg: any): Promise<any> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<any> {
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<any> {
  return Purchases.getCustomerInfo();
}

export function hasPremiumEntitlement(info: any): boolean {
  if (!info?.entitlements?.active) return false;
  return info.entitlements.active['premium'] !== undefined;
}
