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

// Start REPL
const r = repl.start({
  ignoreUndefined: true,
  prompt: "crosis> ",
});

// Expose Crosis client to REPL
r.context.crosis = crosis;
r.context.Crosis = Crosis;

// Create a .connect command
r.defineCommand("connect", {
  help: 'Connects the Crosis client to the Replit adapter. Usage: ".connect"',
  action: crosis.connect,
});

// Create a .disconnect command
r.defineCommand("disconnect", {
  help: 'Disconnects the Crosis client from the Replit adapter. Usage: ".disconnect"',
  action: crosis.disconnect,
});

// When REPL is closed, disconnect Crosis
r.on("exit", async () => {
  console.log("REPL closed, disconnecting Crosis...");
  await crosis.disconnect();
  console.log("Crosis disconnected.");
});
