export type InventoryStatusFilter = 'draft' | 'applied' | 'cancelled' | 'all';
export type InventoryMode = 'REGULAR' | 'OPENING';

export type InventoryListItem = {
  id: string;
  occurredAt: string;
  status: 'DRAFT' | 'APPLIED' | 'CANCELLED';
  createdAt: string;
  createdBy: { id: string; login: string };
  appliedAt: string | null;
  appliedBy: { id: string; login: string } | null;
  note: string | null;
  linesTotal: number;
  mode: InventoryMode;
};

export type InventoryListResponse = { items: InventoryListItem[]; total: number };

export type InventoryLine = {
  id: string;
  item: { id: string; code: string; name: string; reportUnit: { id: string; name: string } };
  unit: { id: string; name: string };
  qtySystemBase: string;
  qtyFactInput: string | null;
  qtyFactBase: string | null;
  deltaBase: string | null;
  apply: boolean;
  comment: string | null;
};

export type InventoryDetailResponse = {
  session: {
    id: string;
    occurredAt: string;
    status: 'DRAFT' | 'APPLIED' | 'CANCELLED';
    mode: InventoryMode;
    note: string | null;
    createdBy: { id: string; login: string };
    createdAt: string;
    appliedBy: { id: string; login: string } | null;
    appliedAt: string | null;
  };
  lines: InventoryLine[];
};

export type InventoryListQuery = {
  status?: InventoryStatusFilter;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
};

export type InventoryFillScope = 'ALL_ACTIVE' | 'CATEGORY' | 'ITEMS';
