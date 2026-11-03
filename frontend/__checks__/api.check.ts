import { ApiCheck, Frequency } from 'checkly/constructs';

/**
 * Synthetic API Check for Kavach Platform Backend Health
 */
new ApiCheck('kavach-control-plane-health', {
  name: 'Kavach API Health & Liveness Probe',
  frequency: Frequency.EVERY_10M,
  activated: true,
  muted: false,
  request: {
    url: `${process.env.API_BASE_URL || 'http://localhost:8000'}/api/health`,
    method: 'GET',
    assertions: [
      {
        source: 'STATUS_CODE',
        property: 'statusCode',
        comparison: 'EQUALS',
        target: '200',
      },
    ],
  },
});
