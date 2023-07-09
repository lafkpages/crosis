import { Crosis } from "..";
import { replit } from "../lib/adapters";

// This is a basic test
const crosis = new Crosis({
  adapter: replit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
});
