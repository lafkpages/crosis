export interface CrosisOptions {
  adapter?: Adapter;
  debug?: boolean;
  url?: string;
}

export type Adapter = () => Promise<AdapterResult>;

export interface AdapterResult {
  url?: string;
}
