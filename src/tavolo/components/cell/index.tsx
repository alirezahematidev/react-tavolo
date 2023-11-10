import React from "react";
import classNames from "classnames";
import { alignClasses } from "../../../table";
import { ColumnProps, Datasource, RowProps } from "../../types/table.types";
import { useInternalProps } from "../../context";

export interface CellProps<T extends Datasource> extends ColumnProps<T> {
  row: RowProps<T>["row"];
  rowIndex: RowProps<T>["rowIndex"];
  fixed?: boolean;
}

const renderRow = <T extends Datasource>(value: T[keyof T]) => {
  if (typeof value === "object" || typeof value === "function") return null;

  return value as React.ReactNode;
};

const Cell = <T extends Datasource>({ dataIndex, render, row, rowIndex, fixed, align = "center" }: CellProps<T>) => {
  const { rowIdentifier } = useInternalProps<T>();

  return (
    <td data-tavolo-id={rowIdentifier(row)} className={classNames(fixed && "fixed-column")}>
      <div className={classNames("cell", alignClasses[align])}>{render ? render(row, rowIndex) : renderRow(row[dataIndex])}</div>
    </td>
  );
};

export default Cell;
