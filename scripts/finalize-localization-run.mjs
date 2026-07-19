import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const status = {
  generatedAt:new Date().toISOString(),
  mergePassed:false,
  buildPassed:false,
  error:null
};

function run(command, args) {
  const result = spawnSync(command, args, { encoding:'utf8' });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

const merge = run(process.execPath, ['scripts/merge-localization-shards.mjs']);
if (merge.status === 0) {
  status.mergePassed = true;
  const build = run(process.execPath, ['scripts/build-language-pack.mjs']);
  if (build.status === 0) {
    const syntax = run(process.execPath, ['--check', 'language-complete-pack.js']);
    if (syntax.status === 0) status.buildPassed = true;
    else status.error = `Language pack syntax check failed with exit code ${syntax.status}.`;
  } else {
    status.error = `Language pack build failed with exit code ${build.status}.`;
  }
} else {
  status.error = `Shard merge validation failed with exit code ${merge.status}.`;
}

const shardFiles = fs.existsSync('localization-shards')
  ? fs.readdirSync('localization-shards').filter(name => /^localization-shard-\d+\.json$/.test(name)).sort()
  : [];
status.shardFilesFound = shardFiles;
status.shardFileCount = shardFiles.length;

fs.writeFileSync('localization-run-status.json', JSON.stringify(status, null, 2));
console.log(`Localization finalization status: ${JSON.stringify(status)}`);
