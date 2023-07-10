import { Crosis } from "$lib/crosis.js";

import * as protocol from "@replit/protocol";

export class Channel {
  private crosis: Crosis;
  private openChanRes: protocol.api.OpenChannelRes;

  constructor(
    crosis: Crosis,
    openChanRes: protocol.api.OpenChannelRes
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

  close(action?: protocol.api.CloseChannel.Action) {
    return this.crosis.closeChannel(this.id, action);
  }
}
