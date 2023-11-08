import { useComputed, useSignal, useSignalEffect } from "@preact/signals-react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Row$ } from "./row";
import { startTransition, useCallback, useMemo } from "react";
import { Column$ } from "./column";
import { headerColumnKey, resizerTrackId, useChildrenParseAndValidate } from "./helpers";
import { globalSelectedRows } from "./selection.global";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classnames from "classnames";
import { Coordinate, Datasource, ResizerStateWithTrackId, RowIdentifier, TableProps, UseSelectionReturn } from "./tavolo/types/table.types";
import { InternalProvider } from "./tavolo/context/provider";

export const useSelection$ = <T extends Datasource>(): UseSelectionReturn<T> => {
  return { rows: globalSelectedRows.value as ReadonlyArray<T> };
};

export const alignClasses = {
  start: "cell-align-start",
  center: "cell-align-center",
  end: "cell-align-end",
};

const Table = <T extends Datasource>(props: TableProps<T>) => {
  const { data, children, expandOptions, selectOptions, sortOptions, rowIdentifier } = useMemo<TableProps<T>>(
    () => ({ ...props }),
    [props]
  );

  const data$ = useSignal<T[]>(data);

  const dataIdentifiers = useComputed(() => data$.value.map(rowIdentifier));

  const resizerPos = useSignal<Coordinate | null>(null);

  const restrictedBoundary = useSignal<boolean>(false);

  const expandedRecords = useSignal<T[]>([]);

  const areaIntersectedRowIds = useSignal<RowIdentifier[]>([]);

  const resizerState = useSignal<ResizerStateWithTrackId>({ state: {}, trackId: null });

  useSignalEffect(() => {
    if (!selectOptions?.defaultSelectedRows || selectOptions.defaultSelectedRows.length === 0) return;

    globalSelectedRows.value = selectOptions.defaultSelectedRows;
  });

  const columnProps = useChildrenParseAndValidate(children);

  const isMatched = (record: T) => (value: T) => rowIdentifier(record) === rowIdentifier(value);

  const isDismatched = (record: T) => (value: T) => rowIdentifier(record) !== rowIdentifier(value);

  function renderTable() {
    return data$.value.map((row, index) => (
      <Row$<T>
        key={rowIdentifier(row)}
        row={row}
        rowIndex={index}
        isExpanded={expandedRecords.value.some(isMatched(row))}
        onExpand={(expandedRow) => {
          if (!expandOptions) return;

          if (expandedRecords.value.some(isMatched(expandedRow))) {
            expandedRecords.value = expandedRecords.value.filter(isDismatched(row));
          } else {
            expandedRecords.value = [...expandedRecords.peek(), row];
          }

          if (expandOptions.onExpand) expandOptions.onExpand(expandedRecords.value);
        }}
        onSelect={(selected) => {
          if (selected) {
            globalSelectedRows.value = [...globalSelectedRows.peek(), row];
          } else {
            globalSelectedRows.value = globalSelectedRows.value.filter(isDismatched(row));
          }

          if (selectOptions?.onSelectRows) selectOptions.onSelectRows(globalSelectedRows.value);
        }}
      />
    ));
  }

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
      const oldIndex = dataIdentifiers.value.indexOf(active.id);
      const newIndex = dataIdentifiers.value.indexOf(over.id);

      const data = data$.peek();

      data$.value = arrayMove(data$.value, oldIndex, newIndex);

      if (sortOptions?.onSort) sortOptions.onSort(data, data$.value);
    }
  };

  const onMouseDown = (event: React.MouseEvent<HTMLTableElement>) => {
    if (!selectOptions?.dragAreaSelection) return;

    event.preventDefault();

    const { clientX, clientY } = event;

    resizerPos.value = { startX: clientX, startY: clientY, endX: clientX, endY: clientY };
  };

  const moveHandlerCallback = useCallback(
    (event: React.MouseEvent<HTMLTableElement> | MouseEvent) => {
      startTransition(() => {
        if (!resizerPos.value) return;

        const { clientX, clientY } = event;

        resizerPos.value = { ...resizerPos.value, endX: clientX, endY: clientY };

        if (resizerPos.value && restrictedBoundary.value) {
          const intersectedElements = document.elementsFromPoint(resizerPos.value.endX, resizerPos.value.endY);

          const rowElements = intersectedElements.filter((element) => element.hasAttribute("data-tavolo-id"));

          const rowElementIds = rowElements.map((element) => element.getAttribute("data-tavolo-id")) as RowIdentifier[];

          const modifiedRowIds = [...new Set([...areaIntersectedRowIds.value, ...rowElementIds])];

          areaIntersectedRowIds.value = modifiedRowIds;
        }
      });
    },
    [areaIntersectedRowIds, resizerPos, restrictedBoundary.value]
  );

  const onMouseMove = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!selectOptions?.dragAreaSelection) return;

    e.preventDefault();

    moveHandlerCallback(e);
  };

  const upHandlerCallback = useCallback(() => {
    const data = areaIntersectedRowIds.peek();

    const areaIntersectedRows = data$.value.filter((row) => data.some((id) => rowIdentifier(row) === id));

    globalSelectedRows.value = areaIntersectedRows;

    if (selectOptions?.onSelectRows) selectOptions.onSelectRows(globalSelectedRows.value);

    resizerPos.value = null;
  }, [areaIntersectedRowIds, data$.value, resizerPos, rowIdentifier, selectOptions]);

  const onMouseUp = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!selectOptions?.dragAreaSelection) return;

    e.preventDefault();

    upHandlerCallback();
  };

  useSignalEffect(() => {
    if (!resizerPos.value || !selectOptions?.dragAreaSelection) return;

    const handleUp = (e: MouseEvent) => {
      e.preventDefault();

      upHandlerCallback();
    };

    const handleMove = (e: MouseEvent) => {
      e.preventDefault();

      moveHandlerCallback(e);
    };

    window.addEventListener("mouseup", handleUp, false);
    window.addEventListener("mousemove", handleMove, false);

    return () => {
      window.removeEventListener("mouseup", handleUp, false);
      window.removeEventListener("mousemove", handleMove, false);
    };
  });

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      {resizerPos.value && selectOptions?.dragAreaSelection && (
        <div
          style={{
            position: "fixed",
            zIndex: 999,
            background: "#0000ff43",
            border: "1px solid blue",
            cursor: "default",
            pointerEvents: "none",
            left: resizerPos.value.endX < resizerPos.value.startX ? resizerPos.value.endX : resizerPos.value.startX,
            top: resizerPos.value.endY < resizerPos.value.startY ? resizerPos.value.endY : resizerPos.value.startY,
            width: Math.abs(resizerPos.value.endX - resizerPos.value.startX),
            height: Math.abs(resizerPos.value.endY - resizerPos.value.startY),
          }}
        />
      )}
      <table
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        // onMouseEnter={() => (inside$.value = true)}
        // onMouseLeave={() => (inside$.value = false)}
      >
        <thead>
          <tr>
            <th>
              <div style={{ width: 30, height: 30, background: "#ccc", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <input
                  type="checkbox"
                  onChange={(e) => {
                    globalSelectedRows.value = e.target.checked ? data$.value : [];
                  }}
                  checked={globalSelectedRows.value.length === data$.value.length}
                />
              </div>
            </th>
            {expandOptions && (
              <th>
                <div style={{ width: 30, height: 30, background: "#ccc" }}></div>
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
          <InternalProvider {...{ columnProps, expandOptions, rowIdentifier }}>
            <SortableContext items={dataIdentifiers.value} strategy={verticalListSortingStrategy}>
              {renderTable()}
            </SortableContext>
          </InternalProvider>
        </tbody>
      </table>
    </DndContext>
  );
};

Table.Column = Column$;
Table.useSelection = useSelection$;

export default Table;
