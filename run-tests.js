// Run tests and save full output to a file
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'test-output.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w' });

console.log(`Running tests and saving output to: ${logFile}`);

const testProcess = spawn('node', ['simple-test.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Log to both console and file
function logOutput(data) {
  const output = data.toString();
  process.stdout.write(output);
  logStream.write(output);
}

testProcess.stdout.on('data', logOutput);
testProcess.stderr.on('data', logOutput);

testProcess.on('close', (code) => {
  logStream.end();
  console.log(`\nTest process exited with code ${code}`);
  console.log(`Full output saved to: ${logFile}`);
  process.exit(code);
});
