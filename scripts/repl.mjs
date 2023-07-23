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
});

// Expose Crosis client to REPL
r.context.crosis = crosis;
r.context.Crosis = Crosis;

// When REPL is closed, disconnect Crosis
r.on("exit", async () => {
  console.log("REPL closed, disconnecting Crosis...");
  await crosis.disconnect();
  console.log("Crosis disconnected.");
});
