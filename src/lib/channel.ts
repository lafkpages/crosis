//!*/
// Don't remove this comment

import { api as protocol } from "@replit/protocol";

import { Crosis } from "./crosis.js";

export class Channel {
  private crosis: Crosis;
  private openChanRes: protocol.OpenChannelRes;

  constructor(
    crosis: Crosis,
    openChanRes: protocol.OpenChannelRes
  ) {
    this.crosis = crosis;
    this.openChanRes = openChanRes;
  }

  get id() {
    return this.openChanRes.id;
  }

  send(...args: Parameters<Crosis["send"]>) {
    args[0].channel = this.id;

    return this.crosis.send(...args);
  }

  close(action?: protocol.CloseChannel.Action) {
    return this.crosis.closeChannel(this.id, action);
  }
}
