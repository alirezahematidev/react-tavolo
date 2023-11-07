import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { Expandable, alignClasses, useTavoloContext } from "./tavolo";
import { rowColumnKey } from "./helpers";
import { effect, useSignal } from "@preact/signals-react";
import { selectedRows$ } from "./selection.global";
import { Fragment } from "react";
import classNames from "classnames";

const renderRow = <T extends object>(value: T[keyof T]) => {
  if (typeof value === "object" || typeof value === "function") return null;

  return value as React.ReactNode;
};

interface RowProps<T extends object> {
  row: T;
  rowIndex: number;
  expandable?: Expandable<T>;
  expandedRows: T[];
  onSelect(selected: boolean): void;
  onExpand(expandedRow: T): void;
}

export const Row$ = <T extends object>({ onSelect, onExpand, rowIndex, row, expandedRows, expandable }: RowProps<T>) => {
  const { columnProps, rowIdentifier } = useTavoloContext<T>();

  const checked$ = useSignal<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowIdentifier(row) });

  effect(() => {
    checked$.value = selectedRows$.value.some((selectedRow) => rowIdentifier(selectedRow) === rowIdentifier(row));
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 99 : "auto",
  };

  return (
    <Fragment>
      <tr ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <td data-tavolo-id={rowIdentifier(row)}>
          <div style={{ width: 30, height: 30, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <input
              type="checkbox"
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                onSelect(e.target.checked);
              }}
              checked={checked$.value}
            />
          </div>
        </td>
        {expandable && (
          <td>
            <div style={{ width: 30, height: 30, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {(!expandable.expandable || expandable.expandable(row)) && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={() => onExpand(row)}
                  style={{ width: 15, height: 15, display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                  +
                </button>
              )}
            </div>
          </td>
        )}
        {(columnProps || []).map(({ dataIndex, align = "center", render }, index) => (
          <td key={rowColumnKey<T>(dataIndex, index)} data-tavolo-id={rowIdentifier(row)}>
            <div className={classNames("cell", alignClasses[align])}>{render ? render(row, rowIndex) : renderRow(row[dataIndex])}</div>
          </td>
        ))}
      </tr>
      {expandable && expandedRows.some((_row) => rowIdentifier(_row) === rowIdentifier(row)) && (
        <tr style={{ background: "red", ...style }}>
          <td colSpan={4} style={{ overflow: "hidden" }}>
            {expandable.render(row)}
          </td>
        </tr>
      )}
    </Fragment>
  );
};
