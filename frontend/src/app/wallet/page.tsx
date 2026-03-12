'use client';

import UnifiedWalletDashboard from '@/components/wallet/UnifiedWalletDashboard';

/**
 * Unified Wallet Entry Point
 * This page serves Influencers, Business Operators, and Admins.
 * The internal logic of UnifiedWalletDashboard handles role-based 
 * data fetching and tab visibility.
 */
export default function WalletEntryPage() {
  return (
    <div className="min-h-[80vh]">
      {/* We wrap this in a container to ensure it fits nicely 
          within the RootLayout's <main> padding 
      */}
      <UnifiedWalletDashboard />
    </div>
  );
}