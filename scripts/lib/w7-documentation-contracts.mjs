import path from 'node:path';

export const PRODUCTION_READY_STATUS_RE = /(?:\*\*)?(?:Current Status|Status|Decision)(?:\*\*)?\s*:[^\n]{0,160}\bProduction[ -]Ready\b/i;

export function findProductionReadyStatusClaims(entries) {
  const findings = [];
  for (const { file, text } of entries) {
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (PRODUCTION_READY_STATUS_RE.test(line)) findings.push({ file, line: index + 1, text: line.trim() });
    });
  }
  return findings;
}

export function parseComposeServiceNames(text) {
  const lines = text.split(/\r?\n/);
  const names = [];
  let inServices = false;
  for (const line of lines) {
    if (/^services:\s*$/.test(line)) { inServices = true; continue; }
    if (!inServices) continue;
    if (/^[^\s#][^:]*:\s*$/.test(line)) break;
    const match = line.match(/^  ([A-Za-z0-9][A-Za-z0-9_-]*):\s*$/);
    if (match) names.push(match[1]);
  }
  return names.sort();
}

export function extractDeclaredComposeServices(text) {
  const section = text.match(/contains exactly:\s*\n([\s\S]*?)(?:\n\n|\nThere are)/i)?.[1] ?? '';
  return [...section.matchAll(/^- `([^`]+)`\s*$/gm)].map((m) => m[1]).sort();
}

export function extractOperationalPaths(text) {
  const paths = new Set();
  for (const match of text.matchAll(/`((?:scripts|docs|\.github)\/[A-Za-z0-9_./-]+|docker-compose\.yml|package\.json)`/g)) {
    paths.add(match[1].replace(/[.,;:]$/, ''));
  }
  return [...paths].sort();
}

// General source jobs stay browser-free. Only this explicit, dependency-gated
// synthetic Linux review may install a browser and run the fixed lab harness.
export function sourceCiBrowserBoundaryDeclared(text) {
  const start=text.search(/^  linux-runtime-review:\s*$/m);
  if(start<0)return !/playwright|post28-linux-artifact-runtime/i.test(text);
  const rest=text.slice(start),next=rest.slice(1).search(/^  [\w-]+:\s*$/m);
  const end=next<0?text.length:start+next+1;
  const review=text.slice(start,end),outside=text.slice(0,start)+text.slice(end);
  const browserLines=review.split(/\r?\n/).filter(line=>/playwright/i.test(line));
  const steps=review.split(/^      - /m).slice(1);
  const gate="if: github.event_name == 'push' && github.ref == 'refs/heads/feat/post28-r07-artifact-preparation'";
  const runtimeSteps=steps.filter(step=>/post28-linux-artifact-runtime/.test(step));
  const permittedRuntime=step=>{
    const requiredGate=step.includes(' --r14-rollback')?gate+" && steps.rollback-eligibility.outputs.eligible == 'true'":gate;
    if(!step.split(/\r?\n/).some(line=>line.trim()===requiredGate)
      ||!/^          POST28_LINUX_RUNTIME_REVIEW: 'YES'\s*$/m.test(step))return false;
    const commands=step.split(/\r?\n/).filter(line=>/post28-linux-artifact-runtime/.test(line));
    if(commands.length!==1)return false;
    if(/^        run: node scripts\/release\/post28-linux-artifact-runtime\.mjs "\$RUNNER_TEMP\/r07-linux"(?: --(?:r08-combined|r09-learner|r09-public)| --r09-public --r11-contention)?\s*$/m.test(step))return true;
    if(/^        run: node scripts\/release\/post28-linux-artifact-runtime\.mjs "\$RUNNER_TEMP\/r14-rollback" --r14-rollback\s*$/m.test(step))return true;
    return /^        run: \|\r?\n          mkdir "\$RUNNER_TEMP\/r14-linux"\r?\n          cp -a "\$RUNNER_TEMP\/r07-linux\/artifacts" "\$RUNNER_TEMP\/r07-linux\/linux-image-probe.json" "\$RUNNER_TEMP\/r14-linux\/"\r?\n          node --import tsx scripts\/release\/post28-linux-artifact-runtime\.mjs "\$RUNNER_TEMP\/r14-linux" --r14-admin-cms\s*$/.test(step.slice(step.indexOf('        run:')));
  };
  return !/playwright|post28-linux-artifact-runtime/i.test(outside)
    && browserLines.length===1
    && browserLines[0].trim()==='run: npx --no-install playwright install --with-deps chromium'
    && /^    needs: \[source-quality, artifact-retrieval\]\s*$/m.test(review)
    && steps.filter(step=>/playwright/i.test(step)).every(step=>step.split(/\r?\n/).some(line=>line.trim()===gate))
    && runtimeSteps.length>=1 && runtimeSteps.length<=3
    && runtimeSteps.every(permittedRuntime)
    && runtimeSteps.some(step=>step.includes('"$RUNNER_TEMP/r07-linux"'));
}

export function hasRebaselineOpenStatusRows(text) {
  return text.split(/\r?\n/).some((line) => /^\|/.test(line) && /\|\s*Rebaseline Open\s*\|/.test(line));
}

export function resolveDocLink(root, documentPath, href) {
  if (/^(?:https?:|mailto:|#)/.test(href)) return null;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return null;
  return path.resolve(path.dirname(documentPath), clean);
}
