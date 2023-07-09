export interface CrosisOptions {
  adapter?: Adapter;
  autoConnect?: boolean;
  url?: string;
}

export type Adapter = () => Promise<AdapterResult>;

export interface AdapterResult {
  url?: string;
}
