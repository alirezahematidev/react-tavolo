import { Fragment } from "react";
import { useInternalProps } from "../../context";
import { Datasource, RowProps } from "../../types/table.types";
import Cell from "../cell";
import { rowColumnKey } from "../../../helpers";

export interface CellsProps<T extends Datasource> extends Pick<RowProps<T>, "row" | "rowIndex"> {}

const Cells = <T extends Datasource>(a: CellsProps<T>) => {
  const { columnProps } = useInternalProps<T>();

  return (
    <Fragment>
      {(columnProps || []).map((props, index) => (
        <Cell key={rowColumnKey<T>(props.dataIndex, index)} row={a.row} rowIndex={a.rowIndex} {...props} />
      ))}
    </Fragment>
  );
};

export default Cells;
