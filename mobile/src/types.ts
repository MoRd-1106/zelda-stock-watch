export type StoreStatus =
  | 'AVAILABLE'
  | 'PREORDER'
  | 'COMING_SOON'
  | 'OUT_OF_STOCK'
  | 'LISTED'
  | 'NOT_FOUND'
  | 'BLOCKED'
  | 'ERROR';

export type StoreResult = {
  id: string;
  retailer: string;
  country: 'USA' | 'Colombia' | string;
  url: string;
  currency: 'USD' | 'COP' | string;
  expectedPrice?: number | null;
  price?: number | null;
  status: StoreStatus;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  checkedAt: string;
  httpStatus?: number | null;
};

export type StockPayload = {
  schemaVersion: number;
  product: {
    id: string;
    name: string;
    releaseDate: string;
    upc?: string;
  };
  generatedAt: string;
  alertCount: number;
  stores: StoreResult[];
};
