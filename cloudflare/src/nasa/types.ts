export type NasaDatasetKey = "gibs" | "modis" | "viirs" | "firms" | "smap";

export type NasaDatasetName = "GIBS" | "MODIS" | "VIIRS" | "FIRMS" | "SMAP";

export type EarthdataDatasetConfig = {
  key: NasaDatasetKey;
  dataset: NasaDatasetName;
  description: string;
  cacheTtlSeconds: number;
  defaultParams: Record<string, string>;
};

export type EarthdataClientRequest = {
  dataset: NasaDatasetName;
  url: string;
  token: string;
  timeoutMs?: number;
};

export type EarthdataSuccessResponse = {
  success: true;
  source: "NASA Earthdata";
  dataset: NasaDatasetName;
  request_url: string;
  status: number;
  response_time_ms: number;
  timestamp: string;
  data: unknown;
};

export type EarthdataErrorResponse = {
  success: false;
  source: "NASA Earthdata";
  dataset: NasaDatasetName;
  error: string;
  timestamp: string;
};

export type NasaRouteEnv = {
  EARTHDATA_TOKEN?: string;
};
