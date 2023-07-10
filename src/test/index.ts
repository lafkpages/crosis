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
  debug: true,
});

crosis.connect().then(async () => {
  console.log("Crosis connected!");

  const gcsFilesChannel = await crosis.openChannel("gcsfiles");
  console.log("Opened GCSFiles channel!");

  const fileRes = await gcsFilesChannel.send({
    read: {
      path: "test.txt",
    },
  });

  console.log("Contents of test.txt:", fileRes.file.content.toString());

  crosis.disconnect();
});
