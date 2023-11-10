import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { effect, useSignal } from "@preact/signals-react";
import { Fragment, useRef } from "react";
import { Datasource, RowProps } from "../../types/table.types";
import { useInternalProps } from "../../context";
import { table$ } from "../../signals";
import Cells from "../cells";
import { useMergeRefs } from "../../helpers";
import { LazyRender } from "./lazyRender";

const Row$ = <T extends Datasource>({ onSelect, onExpand, isExpanded, rowIndex, row }: RowProps<T>) => {
  const { expandOptions, lazy, rowIdentifier } = useInternalProps<T>();

  const checked = useSignal<boolean>(false);

  const lazyRef = useRef<HTMLElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rowIdentifier(row) });

  const ref = useMergeRefs(setNodeRef, lazyRef);

  effect(() => {
    checked.value = table$.rows.value.some((selectedRow) => rowIdentifier(selectedRow) === rowIdentifier(row));
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 99 : "auto",
    borderBottom: "1px solid #f2f2f2",
    background: isDragging ? "#f2f2f2" : "#fff",
  };

  return (
    <Fragment>
      <tr ref={ref} style={style} {...attributes} {...listeners}>
        <td data-tavolo-id={rowIdentifier(row)}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 10,
            }}
          >
            <input
              type="checkbox"
              style={{ height: 14, width: 14 }}
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
            <div style={{ width: 30, display: "flex", justifyContent: "center", alignItems: "center" }}>
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

        <LazyRender lazyRef={lazyRef} lazy={lazy}>
          <Cells {...{ row, rowIndex }} />
        </LazyRender>
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
