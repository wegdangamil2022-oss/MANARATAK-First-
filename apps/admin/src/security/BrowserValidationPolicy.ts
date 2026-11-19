import { config } from 'zod';

// Use interpreted validation under the strict browser CSP, without an eval probe.
config({ jitless: true });
