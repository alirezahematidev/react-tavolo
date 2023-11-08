import { addSignature } from "./tavolo/helpers";
import { ColumnProps, Datasource } from "./tavolo/types/table.types";

function Column$<T extends Datasource>(_props: ColumnProps<T>) {
  return null;
}

addSignature(Column$);

export { Column$ };
