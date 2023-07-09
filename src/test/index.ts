import { Crosis } from "..";
import { replit } from "../lib/adapters";

import { config as dotenv } from "dotenv";
dotenv();

// This is a basic test
// If it outputs nothing it works
const crosis = new Crosis({
  adapter: replit({
    replId: process.env.REPL_ID,
    sid: process.env.REPLIT_SID,
  }),
});

crosis.connect().then(async () => {
  console.log("Crosis connected!");

  const gcsFilesChannel = await crosis.openChannel({
    service: "gcsfiles",
  });
});
