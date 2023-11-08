import { ColumnProps, Datasource } from "../types/table.types";

function addSignature<T extends Datasource>(column: (props: ColumnProps<T>) => null) {
  Object.defineProperty(column, "$$", { value: `__tavolo__`, enumerable: false, writable: false });
}

export { addSignature };
