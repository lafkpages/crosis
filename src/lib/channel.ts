import { Crosis } from "$lib/crosis.js";

import { replit as ReplitProtocol } from "@replit/protocol";

export class Channel {
  private crosis: Crosis;
  private openChanRes: ReplitProtocol.goval.api.OpenChannelRes;

  constructor(
    crosis: Crosis,
    openChanRes: ReplitProtocol.goval.api.OpenChannelRes
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

  close(action?: ReplitProtocol.goval.api.CloseChannel.Action) {
    return this.crosis.closeChannel(this.id, action);
  }
}
