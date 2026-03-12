const HIGH_VALUE_THRESHOLD = 10000;

/**
 * Security Protocol: High-Value Transaction Monitoring
 * Optimized for local SQLite-backed API.
 */
export async function securityCheck(amount: number, vaultId: string, actorId: string) {
  if (amount >= HIGH_VALUE_THRESHOLD) {
    try {
      // Directs log to your SQLite backend via the port 8000 endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/audit/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: 'HIGH_VALUE_FLAG',
          actor_id: actorId,
          case_id: vaultId,
          severity: 'critical',
          metadata: {
            amount,
            threshold: HIGH_VALUE_THRESHOLD,
            message: "Transaction exceeds protocol safety limits. Manual review required."
          }
        }),
      });

      if (!response.ok) {
        console.warn("AUDIT_LOG_OFFLINE: Log not saved to SQLite ledger.");
      }
    } catch (error) {
      // In Dev Mode, we just log to console if the backend is down
      if (process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
        console.log("DEV_MODE: Security Flag Raised (Backend Unreachable)", { amount, vaultId });
      }
    }

    return { 
      flagged: true, 
      message: "Security Protocol: High-value transaction flagged for review." 
    };
  }
  
  return { flagged: false };
}