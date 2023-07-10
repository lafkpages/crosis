import _protocol from "@replit/protocol";
import protocol = _protocol.api;

import { Crosis } from "./crosis";

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
