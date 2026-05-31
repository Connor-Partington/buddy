const fs = require('node:fs');
const path = require('node:path');

const triggerPath = path.join(process.cwd(), '.buddy-demo-trigger');
const payload = {
  startedAt: new Date().toISOString(),
};

try {
  fs.writeFileSync(triggerPath, `${JSON.stringify(payload)}\n`);
  console.log('Started Buddy feature demo. Keep the Extension Development Host focused while recording.');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Could not write the Buddy demo trigger: ${message}`);
  process.exit(1);
}
