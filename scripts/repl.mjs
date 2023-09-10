#!/usr/bin/env node

// Crosis lib
import { Crosis, adapterReplit } from "../dist/index.js";

// Node REPL
import repl from "repl";

// Load dutenv
import { config as dotenv } from "dotenv";
dotenv();

// Crosis client
const crosis = new Crosis({
  adapter: adapterReplit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
  debug: true,
});

crosis.on("message", () => {
  if (crosis.debug) {
    r.displayPrompt();
  }
});

// Start REPL
const r = repl.start({
  ignoreUndefined: true,
  prompt: "crosis> ",
});

// Expose Crosis client to REPL
function setContext() {
  r.context.crosis = crosis;
  r.context.Crosis = Crosis;
}
setContext();
r.on("reset", setContext);

// Create a .connect command
r.defineCommand("connect", {
  help: 'Connects the Crosis client to the Replit adapter. Usage: ".connect"',
  action: async () => {
    await crosis.connect();

    r.displayPrompt();
  },
});

// Create a .connect-local command
r.defineCommand("connect-local", {
  help: 'Connects the Crosis client to a local server. Usage: ".connect-local [port=4096]"',
  action: async (port) => {
    port = parseInt(port) || 4096;

    crosis.setAdapter(null);
    crosis.url = `ws://localhost:${port}`;

    await crosis.connect();

    r.displayPrompt();
  },
});

// Create a .disconnect command
r.defineCommand("disconnect", {
  help: 'Disconnects the Crosis client. Usage: ".disconnect"',
  action: () => {
    crosis.disconnect();
  },
});

// REPL history
r.setupHistory(".replhist.txt", () => {});

// When REPL is closed, disconnect Crosis
r.on("exit", async () => {
  console.log("REPL closed, disconnecting Crosis...");
  const disconnected = await crosis.disconnect();

  if (disconnected) {
    console.log("Crosis disconnected.");
  } else {
    console.log("Crosis was already disconnected.");
  }
});
