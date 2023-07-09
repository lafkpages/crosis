import { WebSocket } from "ws";
import type { CrosisOptions, Adapter } from "./lib/types";

const defaultOptions: CrosisOptions = {
  autoConnect: true,
};

class Crosis {
  private url: string | null;
  private adapter: Adapter | null;
  private ws: WebSocket;

  constructor(options: CrosisOptions) {
    options = {
      ...defaultOptions,
      ...options,
    };

    this.adapter = options.adapter || null;

    this.url = options.url || undefined;
    this.ws = null;
  }

  async connect() {
    const adapterResult = this.adapter ? await this.adapter() : null;

    if (adapterResult?.url) {
      this.url = adapterResult.url;
    }

    this.ws = new WebSocket(this.url);

    // Wait for the WebSocket to be ready
    await new Promise((resolve) => {
      this.ws.onopen = resolve;
    });
  }
}
