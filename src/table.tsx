import { untracked, useSignal, useSignalEffect } from "@preact/signals-react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Row$ } from "./row";
import { useCallback, useMemo } from "react";
import { Column$ } from "./column";
import { headerColumnKey, resizerTrackId, useChildrenParseAndValidate } from "./helpers";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classnames from "classnames";
import type {
  Coordinate,
  Datasource,
  ResizerStateWithTrackId,
  RowIdentifier,
  TableProps,
  UsePaginationReturn,
  UseSelectionReturn,
} from "./tavolo/types/table.types";
import { InternalProvider } from "./tavolo/context/provider";
import { table$ } from "./tavolo/signals";
import { PAGE_SIZE } from "./tavolo/constants";
import { useTableCallbacks } from "./tavolo/callbacks";

export const alignClasses = {
  start: "cell-align-start",
  center: "cell-align-center",
  end: "cell-align-end",
};

const Table = <T extends Datasource>(props: TableProps<T>) => {
  const { data, children, rowIdentifier, ...rest } = props;

  const data$ = useSignal<T[]>(data);

  const resizer = useSignal<Coordinate | null>(null);

  const restrictedBoundary = useSignal<boolean>(false);

  const expandedRecords = useSignal<T[]>([]);

  const areaIntersectedRowIds = useSignal<RowIdentifier[]>([]);

  const resizerState = useSignal<ResizerStateWithTrackId>({ state: {}, trackId: null });

  const columnProps = useChildrenParseAndValidate(children);

  useSignalEffect(() => {
    const { selectOptions } = props;

    if (!selectOptions) return undefined;

    const { defaultSelectedRows } = selectOptions;

    if (!defaultSelectedRows || defaultSelectedRows.length === 0) return;

    table$.rows.value = defaultSelectedRows;
  });

  useSignalEffect(() => {
    const { pagination } = props;

    function slicedData(data: T[], size: number) {
      const page = table$.page.value;

      return data.slice((page - 1) * size, page * size);
    }

    if (pagination) {
      if (typeof pagination === "boolean") {
        data$.value = slicedData(data, PAGE_SIZE);
      } else {
        const { lazy, pageSize = PAGE_SIZE } = pagination;

        if (lazy) data$.value = slicedData(data, pageSize);
      }
    }
  });

  const loadedDatasource = useMemo(() => {
    const { pagination } = props;

    if (!pagination) return data;

    if (typeof pagination === "boolean") return data$.value;

    if (pagination.lazy) return data$.value;

    return data;
  }, [data, data$.value, props]);

  const dataIdentifiers = useMemo(() => loadedDatasource.map(rowIdentifier), [loadedDatasource, rowIdentifier]);

  const renderTable = useCallback(() => {
    const isMatched = (record: T) => (value: T) => rowIdentifier(record) === rowIdentifier(value);

    const isDismatched = (record: T) => (value: T) => rowIdentifier(record) !== rowIdentifier(value);

    return loadedDatasource.map((row, index) => (
      <Row$<T>
        key={rowIdentifier(row)}
        row={row}
        rowIndex={index}
        isExpanded={expandedRecords.value.some(isMatched(row))}
        onExpand={(expandedRow) => {
          const { expandOptions } = props;

          if (!expandOptions) return undefined;

          if (expandedRecords.value.some(isMatched(expandedRow))) {
            expandedRecords.value = expandedRecords.value.filter(isDismatched(row));
          } else {
            expandedRecords.value = [...expandedRecords.peek(), row];
          }

          if (expandOptions.onExpand) expandOptions.onExpand(expandedRecords.value);
        }}
        onSelect={(selected) => {
          const { selectOptions } = props;

          if (selected) {
            table$.rows.value = [...table$.rows.peek(), row];
          } else {
            table$.rows.value = table$.rows.value.filter(isDismatched(row));
          }

          if (selectOptions?.onSelectRows) selectOptions.onSelectRows(table$.rows.value);
        }}
      />
    ));
  }, [expandedRecords, loadedDatasource, props, rowIdentifier]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over === null) return;

    if (active.id !== over.id) {
      const oldIndex = dataIdentifiers.indexOf(active.id);
      const newIndex = dataIdentifiers.indexOf(over.id);

      const sortedData = arrayMove(loadedDatasource, oldIndex, newIndex);

      const { sortOptions } = props;

      if (!sortOptions) return undefined;

      if (sortOptions.onSort) sortOptions.onSort(loadedDatasource, sortedData);
    }
  };

  const onGrabResizeHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, trackId: string, width: number | string) => {
    e.preventDefault();

    resizerState.value = {
      state: {
        ...resizerState.value.state,
        [trackId]: {
          position: e.clientX,
          width: resizerState.value.state[trackId] ? resizerState.value.state[trackId].width || width : width,
        },
      },
      trackId,
    };
  };

  const onReleaseResizeHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();

    resizerState.value = { ...resizerState.value, trackId: null };
  };

  useSignalEffect(() => {
    const handleResizing = (e: MouseEvent) => {
      e.preventDefault();

      if (resizerState.value.trackId) {
        const trackId = resizerState.value.trackId;

        const trackingState = resizerState.value.state[trackId];

        if (trackingState) {
          const replacement = e.clientX - trackingState.position;

          const modifiedWidth = Number(trackingState.width) + replacement;

          resizerState.value = {
            ...resizerState.value,
            state: { ...resizerState.value.state, [trackId]: { position: e.clientX, width: modifiedWidth } },
          };
        }
      }
    };

    const handleRelease = (e: MouseEvent) => {
      e.preventDefault();

      resizerState.value = { ...resizerState.value, trackId: null };
    };

    window.addEventListener("mousemove", handleResizing, false);
    window.addEventListener("mouseup", handleRelease, false);

    return () => {
      window.removeEventListener("mousemove", handleResizing, false);
      window.removeEventListener("mouseup", handleRelease, false);
    };
  });

  const decrement = () => table$.page.value - 1;
  const increment = () => table$.page.value + 1;

  const listeners = useTableCallbacks<T>({
    signals: { resizer, restrictedBoundary, areaIntersectedRowIds },
    loadedDatasource,
    rowIdentifier,
    ...rest,
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      {resizer.value && props.selectOptions?.dragAreaSelection && (
        <div
          style={{
            position: "fixed",
            zIndex: 999,
            background: "#0000ff43",
            border: "1px solid blue",
            cursor: "default",
            pointerEvents: "none",
            left: resizer.value.endX < resizer.value.startX ? resizer.value.endX : resizer.value.startX,
            top: resizer.value.endY < resizer.value.startY ? resizer.value.endY : resizer.value.startY,
            width: Math.abs(resizer.value.endX - resizer.value.startX),
            height: Math.abs(resizer.value.endY - resizer.value.startY),
          }}
        />
      )}
      <table {...listeners}>
        <thead>
          <tr>
            <th>
              <div style={{ padding:10, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <input
                  type="checkbox"
                  name="all"
                  style={{ height: 14, width: 14 }}
                  onChange={(e) => {
                    table$.rows.value = e.target.checked ? loadedDatasource : [];
                  }}
                  checked={table$.rows.value.length === loadedDatasource.length}
                />
              </div>
            </th>
            {props.expandOptions && (
              <th>
                <div style={{ width: 30, padding: 8, background: "#ccc" }}></div>
              </th>
            )}
            {(columnProps || []).map(({ dataIndex, width = 200, align = "center", title }, index) => (
              <th key={headerColumnKey(dataIndex, index)}>
                <div
                  className={classnames("cell", alignClasses[align])}
                  style={{
                    "--column-width":
                      (resizerState.value.state[resizerTrackId<T>(dataIndex, index)]
                        ? resizerState.value.state[resizerTrackId<T>(dataIndex, index)].width || width
                        : width) + "px",
                  }}
                >
                  <div
                    className="column-resize-handler"
                    onMouseDown={(e) => {
                      onGrabResizeHandler(e, resizerTrackId<T>(dataIndex, index), width);
                    }}
                    onMouseUp={onReleaseResizeHandler}
                  />
                  {title}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <InternalProvider {...{ columnProps, rowIdentifier, ...rest }}>
            <SortableContext items={dataIdentifiers} strategy={verticalListSortingStrategy}>
              {renderTable()}
            </SortableContext>
          </InternalProvider>
        </tbody>
        <tfoot>
          <tr style={{}}>
            <td colSpan={4}>
              <div style={{ border: "1px solid #ccc", height: 30, display: "flex", alignItems: "center" }}>
                <button
                  style={{ width: 30, height: 30 }}
                  disabled={table$.page.value === 1}
                  onClick={() => {
                    table$.page.value = untracked(decrement);
                  }}
                >{`<<`}</button>
                <button style={{ width: 30, height: 30 }}>{table$.page.value}</button>
                <button
                  style={{ width: 30, height: 30 }}
                  onClick={() => {
                    table$.page.value = untracked(increment);
                  }}
                >{`>>`}</button>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </DndContext>
  );
};

const useSelection$ = <T extends Datasource>(): UseSelectionReturn<T> => {
  const rows = Object.freeze(table$.rows.value) as ReadonlyArray<T>;

  return { rows };
};

const usePagination$ = (): UsePaginationReturn => {
  return { page: table$.page.value };
};

Table.Column = Column$;
Table.useSelection = useSelection$;
Table.usePagination = usePagination$;

export default Table;
