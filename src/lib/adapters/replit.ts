import fetch from "node-fetch";

import { userAgent } from "../utils";

import type { Adapter } from "../types";

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
          "user-agent": userAgent,
          cookie: `connect.sid=${encodeURIComponent(options.sid)}`,
        },
        body: "{}",
      }
    );

    if (!metadataReq.ok) {
      throw new Error(
        `Replit metadata request was not successful. Did you enter the correct connect.sid? ${await metadataReq.text()}`
      );
    }

    metadata = await metadataReq.json();
  }

  return {
    url: `${metadata.gurl}/wsv2/${metadata.token}`,
  };
}

/**
 * Returns an adapter that connects to Replit's WebSocket server.
 * This adapter handles the authentication process for you.
 *
 * You can either pass a Goval `token` and `cluster`, which is instant,
 * or a Replit `replId` and `sid`, which is slower since it requires
 * an HTTP request to generate a Goval token for the specified user.
 */
export function replit(options: ReplitAdapterOptions): Adapter {
  return replitAdapter.bind(options);
}
