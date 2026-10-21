#!/usr/bin/env node
// One-time setup for /dashboard on the live site.
//
//   node scripts/connect-dashboard.mjs
//
// Asks for your Dropbox app key and secret and a dashboard password, connects
// Dropbox, and stores all four as Firebase App Hosting secrets. Nothing is
// printed, written to a file, or committed. Run it again to change the
// password or reconnect Dropbox.

import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

const ask = (question, hidden = false) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.startsWith(question)) rl.output.write(question);
        else if (!/\r|\n/.test(s)) rl.output.write("*");
        else rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });

const setSecret = (name, value) => {
  const r = spawnSync("firebase", ["apphosting:secrets:set", name, "--data-file", "-", "--force"], {
    input: value,
    stdio: ["pipe", "ignore", "inherit"],
  });
  if (r.status !== 0) throw new Error(`Couldn't save ${name}. Is the Firebase CLI signed in? (firebase login)`);
  console.log(`  ✓ ${name} saved`);
};

console.log("\nStudio L dashboard setup\n");
const key = await ask("Dropbox App key: ");
const secret = await ask("Dropbox App secret: ", true);

const url = `https://www.dropbox.com/oauth2/authorize?client_id=${encodeURIComponent(key)}&response_type=code&token_access_type=offline`;
console.log("\nOpening Dropbox. Click Allow, then copy the code it shows you.");
spawnSync("open", [url]);
console.log(`(If nothing opened, go to: ${url})\n`);
const code = await ask("Paste the code from Dropbox: ", true);

const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: key, client_secret: secret }),
});
if (!res.ok) {
  console.error(`\nDropbox didn't accept that (${res.status}). Check the key and secret, then run this again.`);
  process.exit(1);
}
const { refresh_token } = await res.json();
if (!refresh_token) {
  console.error("\nDropbox didn't send a refresh token. Run this again.");
  process.exit(1);
}

let password = "";
for (;;) {
  password = await ask("\nChoose a dashboard password (8+ characters): ", true);
  const again = await ask("Type it again: ", true);
  if (password.length < 8) console.log("That's too short.");
  else if (password !== again) console.log("Those didn't match.");
  else break;
}

console.log("\nSaving to Firebase…");
setSecret("DROPBOX_APP_KEY", key);
setSecret("DROPBOX_APP_SECRET", secret);
setSecret("DROPBOX_REFRESH_TOKEN", refresh_token);
setSecret("DASHBOARD_PASSWORD", password);
console.log("\nDone. Tell Claude it's set up, and the site will be redeployed with the dashboard switched on.\n");
