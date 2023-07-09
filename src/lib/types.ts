export interface CrosisOptions {
  adapter?: Adapter;
  autoConnect?: boolean;
  url?: string;
};

export type Adapter = () => AdapterResult;

export interface AdapterResult {
  url?: string;
};
