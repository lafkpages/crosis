import fetch from "node-fetch";

import type { Adapter } from "../types";

export interface ReplitAdapterOptions {
  replId: string;
  sid: string;
}

export interface ReplitMetadata {
  token?: string;
  gurl?: string;
  conmanURL?: string;
  error?: any;
}

async function replitAdapter() {
  const options = this as ReplitAdapterOptions;

  const metadataReq = await fetch(
    `https://replit.com/data/repls/${options.replId}/get_connection_metadata`,
    {
      method: "POST",
      headers: {
        origin: "https://replit.com",
        "content-type": "application/json",
        "x-requested-with": "Waltuh Whit",
        "user-agent": "Mozillia/6.9",
        cookie: `connect.sid=${encodeURIComponent(options.sid)}`,
      },
      body: "{}",
    }
  );

  if (!metadataReq.ok) {
    throw new Error(
      "Replit metadata request was not successful. Did you enter the correct connect.sid?"
    );
  }

  const metadata: ReplitMetadata = await metadataReq.json();

  return {
    url: `${metadata.gurl}/wsv2/${metadata.token}`,
  };
}

export default function replit(options: ReplitAdapterOptions): Adapter {
  return replitAdapter.bind(options);
}
