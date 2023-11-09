import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { alignClasses } from "./table";
import { rowColumnKey } from "./helpers";
import { effect, useSignal } from "@preact/signals-react";
import { Fragment } from "react";
import classNames from "classnames";
import type { Datasource, RowProps } from "./tavolo/types/table.types";
import { table$ } from "./tavolo/signals";
import { useInternalProps } from "./tavolo/context";

const renderRow = <T extends Datasource>(value: T[keyof T]) => {
  if (typeof value === "object" || typeof value === "function") return null;

  return value as React.ReactNode;
};

const Row$ = <T extends Datasource>({ onSelect, onExpand, isExpanded, rowIndex, row }: RowProps<T>) => {
  const { columnProps, expandOptions, rowIdentifier } = useInternalProps<T>();

  const checked = useSignal<boolean>(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowIdentifier(row) });

  effect(() => {
    checked.value = table$.rows.value.some((selectedRow) => rowIdentifier(selectedRow) === rowIdentifier(row));
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 99 : "auto",
  };

  return (
    <Fragment>
      <tr ref={setNodeRef} style={style}>
        <td data-tavolo-id={rowIdentifier(row)}>
          <div style={{ width: 30, height: 30, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <input
              type="checkbox"
              name={`name-${rowIndex}`}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => {
                onSelect(e.target.checked);
              }}
              checked={checked.value}
            />
          </div>
        </td>
        {expandOptions && (
          <td>
            <div style={{ width: 30, height: 30, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {(!expandOptions.expandable || expandOptions.expandable(row)) && (
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
      {expandOptions && isExpanded && (
        <tr style={{ background: "red", ...style }}>
          <td colSpan={4} style={{ overflow: "hidden" }}>
            {expandOptions.render?.(row, rowIndex)}
          </td>
        </tr>
      )}
    </Fragment>
  );
};

export { Row$ };
