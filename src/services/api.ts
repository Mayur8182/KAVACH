/**
 * External Webhook and Integration Dispatcher
 */

import axios from 'axios';

/**
 * Dispatches webhook notification to target URL.
 * Security Hotspot: SSRF risk when sending HTTP requests to unvalidated destinations.
 */
export async function forwardWebhook(destinationUrl: string, payload: any): Promise<any> {
  // Initiating outbound HTTP request to arbitrary user-supplied URL
  const response = await axios.post(destinationUrl, payload, { timeout: 5000 });
  return response.data;
}
