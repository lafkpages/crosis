import fetch from "node-fetch";

import type { Adapter } from "$lib/types";

export interface ReplitAdapterOptionsBySid {
  replId: string;
  sid: string;
}

export interface ReplitAdapterOptionsByToken {
  token: string;
  cluster: string;
}

export type ReplitAdapterOptions =
  | ReplitAdapterOptionsBySid
  | ReplitAdapterOptionsByToken;

export interface ReplitMetadata {
  token?: string;
  gurl?: string;
  conmanURL?: string;
  error?: any;
}

async function replitAdapter() {
  const options = this as ReplitAdapterOptions;

  let metadata: ReplitMetadata;

  if ("token" in options) {
    const host = `eval.${options.cluster}.replit.com`;
    metadata = {
      token: options.token,
      gurl: `wss://${host}`,
      // conmanURL: `https://${host}`,
    };
  } else {
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
      },
    );

    if (!metadataReq.ok) {
      throw new Error(
        `Replit metadata request was not successful. Did you enter the correct connect.sid? ${await metadataReq.text()}`,
      );
    }

    metadata = await metadataReq.json();
  }

  return {
    url: `${metadata.gurl}/wsv2/${metadata.token}`,
  };
}

export function replit(options: ReplitAdapterOptions): Adapter {
  return replitAdapter.bind(options);
}
