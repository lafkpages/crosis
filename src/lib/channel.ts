import _protocol from "@replit/protocol";
import protocol = _protocol.api;

import { Crosis } from "./crosis.js";

export class Channel {
  private crosis: Crosis;
  private openChanRes: protocol.OpenChannelRes;
  service: string;
  name: string;

  constructor(
    crosis: Crosis,
    openChanRes: protocol.OpenChannelRes,
    service: string,
    name: string
  ) {
    this.crosis = crosis;
    this.openChanRes = openChanRes;

    this.service = service;
    this.name = name;
  }

  /**
   * Returns the channel's ID.
   */
  get id() {
    return this.openChanRes.id;
  }

  /**
   * Sends a message to the server,
   * with the channel ID set to this channel's ID.
   */
  send(...args: Parameters<Crosis["send"]>) {
    args[0].channel = this.id;

    return this.crosis.send(...args);
  }

  /**
   * Closes this channel.
   *
   * Equivalent to `crosis.closeChannel(channel.id)`,
   * but this already sets the channel ID for you.
   */
  close(action?: protocol.CloseChannel.Action) {
    return this.crosis.closeChannel(this.id, action);
  }
}
