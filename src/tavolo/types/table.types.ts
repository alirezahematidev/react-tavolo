import { Signal } from "@preact/signals-react";
import { CSSProperties, ReactElement } from "react";

// global types

type Datasource = {
  [key: string]: any;
};

type RowIdentifier = string | number;

type Updater<T, P extends Datasource> = T | ((record: P) => T);

type CoordinateKeyOf = "startX" | "startY" | "endX" | "endY";

type Order = "ascending" | "descending" | "none";

// sorting types

type DragSorting<T extends Datasource> = {
  useDragHandler: boolean | React.ReactNode;
  sortingRowStyle: Updater<CSSProperties, T>;
  sortingRowClassName: Updater<string, T>;
};

type SortOptions<T extends Datasource> = {
  onSort?: (data: T[], sortedData: T[]) => void;
  dragSorting?: boolean | Partial<DragSorting<T>>;
  renderSorter?: React.ReactNode | ((order: Order) => React.ReactNode);
};

type Coordinate = {
  [K in CoordinateKeyOf]: number;
};

type ResizerInfo = {
  position: number;
  width: number | string;
};

type ResizerState = Record<string, ResizerInfo>;

type ResizerStateWithTrackId = {
  state: ResizerState;
  readonly trackId: string | null;
};

// expanding types

type ExpandOptions<T extends Datasource> = {
  render?: (record: T, rowIndex: number) => React.ReactNode;
  expandable?: (record: T) => boolean;
  onExpand?: (records: T[]) => void;
  /**
   * @todo
   */
  transition?: any;
};

// selecting types

type DragAreaSelection = {
  customActivatorKey: string;
  bgColor: string;
};

type SelectOptions<T extends Datasource> = {
  onSelectRows?: (records: T[]) => void;
  dragAreaSelection?: boolean | Partial<DragAreaSelection>;
  defaultSelectedRows?: T[];
  unselectableRows?: T[];
  style?: Updater<CSSProperties, T>;
  className?: Updater<string, T>;
};

// column types

type ColumnOptions<T extends Datasource> = {
  width: number;
  align: "start" | "center" | "end";
  fixed: boolean;
  sorter: (a: T, b: T) => number;
  render: (record: T, rowIndex: number) => React.ReactNode;
};

// pagination types

type PaginationOption = {
  // page: number;
  pageSize?: number;
  total?: number;
  slice?: boolean;
  onPageChange?: (previous: number, current: number) => void;
};

type UsePaginationReturn = {
  readonly page: number;
};

interface ColumnProps<T extends Datasource> extends Partial<ColumnOptions<T>> {
  title: string | React.ReactNode;
  dataIndex: keyof T;
}

// row props

interface RowProps<T extends Datasource> {
  row: T;
  rowIndex: number;
  isExpanded: boolean;
  onSelect: (checked: boolean) => void;
  onExpand: (expandedRow: T) => void;
}

// selection types

type UseSelectionReturn<T extends Datasource> = {
  rows: ReadonlyArray<T>;
};

// context types

type SkippedParams = "data" | "children";

interface TableContextParams<T extends Datasource = any> extends Omit<TableProps<T>, SkippedParams> {
  columnProps: ColumnProps<T>[];
}

interface UseTableCallbackProps<T extends Datasource = any> extends Omit<TableProps<T>, SkippedParams> {
  loadedDatasource: T[];
  signals: {
    resizer: Signal<Coordinate | null>;
    restrictedBoundary: Signal<boolean>;
    areaIntersectedRowIds: Signal<RowIdentifier[]>;
  };
}

interface InternalProviderProps<T extends Datasource> extends TableContextParams<T> {
  children: React.ReactNode;
}

// main types

interface TableProps<T extends Datasource> {
  readonly data: T[];
  children: ReactElement<ColumnProps<T>>[];
  rowIdentifier: (record: T) => RowIdentifier;
  expandOptions?: ExpandOptions<T>;
  sortOptions?: SortOptions<T>;
  selectOptions?: SelectOptions<T>;
  customRowStyle?: Updater<CSSProperties, T>;
  customRowClassName?: Updater<string, T>;
  pagination?: boolean | PaginationOption;
  lazy?: boolean;
  /**
   * @todo
   */
  loading?: boolean;
  /**
   * @todo
   */
  placeholder?: React.ReactNode;
  /**
   * @todo
   */
  error?: any;
}

export type {
  TableProps,
  InternalProviderProps,
  Datasource,
  RowIdentifier,
  Coordinate,
  ResizerStateWithTrackId,
  ColumnProps,
  RowProps,
  UseSelectionReturn,
  TableContextParams,
  UsePaginationReturn,
  PaginationOption,
  UseTableCallbackProps,
};
