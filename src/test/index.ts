import { Crosis } from "..";
import { replit } from "../lib/adapters";
import ".env";

// This is a basic test
// If it outputs nothing it works
const crosis = new Crosis({
  adapter: replit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
});

crosis.connect().then(() => {
  console.log("Crosis connected!");
});
