import { useComputed, useSignal, useSignalEffect } from "@preact/signals-react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Row$ } from "./row";
import { CSSProperties, ReactElement, createContext, startTransition, useCallback, useContext, useMemo } from "react";
import { ColumnProps, Column$ } from "./column";
import { headerColumnKey, resizerTrackId, useChildrenParseAndValidate } from "./helpers";
import { selectedRows$ } from "./selection.global";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classnames from "classnames";

export type RowIdentifier = string | number;

type TKey<T extends object> = keyof T;

type DragSorting = {
  cursor: CSSProperties["cursor"];
  useDragHandler: boolean | React.ReactNode;
  sortingRowStyle: CSSProperties;
  sortingRowClassName: string;
};

type ColumnResizing<T extends object> = {
  disabledColumns: Array<TKey<T>>;
  handlerCustomStyle: CSSProperties;
  handlerCustomClassName: string;
  min: number;
  max: number;
};

export type Expandable<T extends object> = {
  render: (row: T) => React.ReactNode;
  expandable?: (row: T) => boolean;
  onExpand?: (rows: T[]) => void;
};

interface TavoloProps<T extends object> {
  datasource: T[];
  children: ReactElement<ColumnProps<T>>[];
  rowIdentifier(row: T): RowIdentifier;
  onSelectRows?(rows: T[]): void;
  onSort?(previousData: T[], data: T[]): void;
  expandOptions?: Expandable<T>;
  dragSorting?: boolean | Partial<DragSorting>;
  dragAreaSelection?: boolean;
  columnResizing?: boolean | Partial<ColumnResizing<T>>;
  defaultSelectedRows?: T[];
}

export type TavoloContextParams<T extends object = any> = {
  columnProps: ColumnProps<T>[];
  rowIdentifier: (row: T) => RowIdentifier;
};

const TavoloContext = createContext<TavoloContextParams>({
  columnProps: [],
  rowIdentifier: () => String(),
});

export const useTavoloContext = <T extends object>() => useContext<TavoloContextParams<T>>(TavoloContext);

type UseSelectionReturn<T extends object> = {
  rows: T[];
};

export const useSelection$ = <T extends object>(): UseSelectionReturn<T> => {
  return { rows: selectedRows$.value as T[] };
};

type Coordinate = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

type ResizerState = {
  [id: string]: {
    position: number;
    width: number;
  };
};

type ResizerStateWithTrackId = {
  state: ResizerState;
  trackId: string | null;
};

export const alignClasses = {
  start: "cell-align-start",
  center: "cell-align-center",
  end: "cell-align-end",
};

const Tavolo = <T extends object>(props: TavoloProps<T>) => {
  const {
    children,
    datasource,
    expandOptions,
    dragAreaSelection,
    defaultSelectedRows = [],
    onSort,
    rowIdentifier,
    onSelectRows,
  } = useMemo<TavoloProps<T>>(() => ({ ...props }), [props]);

  const datasource$ = useSignal<T[]>(datasource);

  const sortableData$ = useComputed(() => datasource$.value.map(rowIdentifier));

  const coordinate$ = useSignal<Coordinate | null>(null);

  const inside$ = useSignal<boolean>(false);

  const expandedRows$ = useSignal<T[]>([]);

  const resizerState$ = useSignal<ResizerStateWithTrackId>({ state: {}, trackId: null });

  useSignalEffect(() => {
    if (!defaultSelectedRows.length) return;

    selectedRows$.value = defaultSelectedRows;
  });

  const columnProps = useChildrenParseAndValidate(children);

  function renderTable() {
    return datasource$.value.map((row, index) => (
      <Row$<T>
        key={rowIdentifier(row)}
        row={row}
        rowIndex={index}
        expandable={expandOptions}
        expandedRows={expandedRows$.value}
        onExpand={(expandedRow) => {
          if (!expandOptions) return;

          if (expandedRows$.value.some((_row) => rowIdentifier(_row) === rowIdentifier(expandedRow))) {
            expandedRows$.value = expandedRows$.value.filter((expandedRow) => rowIdentifier(expandedRow) !== rowIdentifier(row));
          } else {
            expandedRows$.value = [...expandedRows$.peek(), row];
          }

          if (expandOptions.onExpand) expandOptions.onExpand(expandedRows$.value);
        }}
        onSelect={(selected) => {
          if (selected) {
            selectedRows$.value = [...selectedRows$.peek(), row];
          } else {
            selectedRows$.value = selectedRows$.value.filter((selectedRow) => rowIdentifier(selectedRow) !== rowIdentifier(row));
          }

          if (onSelectRows) onSelectRows(selectedRows$.value);
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
      const oldIndex = sortableData$.value.indexOf(active.id);
      const newIndex = sortableData$.value.indexOf(over.id);

      const previousData = datasource$.peek();

      datasource$.value = arrayMove(datasource$.value, oldIndex, newIndex);

      if (onSort) onSort(previousData, datasource$.value);
    }
  };

  const areaIntersectedRowIds = useSignal<RowIdentifier[]>([]);

  const onMouseDown = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!dragAreaSelection) return;

    e.preventDefault();

    coordinate$.value = { startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY };
  };

  const move$ = useCallback(
    (e: React.MouseEvent<HTMLTableElement> | MouseEvent) => {
      startTransition(() => {
        if (!coordinate$.value) return;

        coordinate$.value = { ...coordinate$.value, endX: e.clientX, endY: e.clientY };

        if (coordinate$.value && inside$.value) {
          const intersectedElements = document.elementsFromPoint(coordinate$.value.endX, coordinate$.value.endY);

          const rowElements = intersectedElements.filter((element) => element.hasAttribute("data-tavolo-id"));

          const rowElementIds = rowElements.map((element) => element.getAttribute("data-tavolo-id")) as RowIdentifier[];

          const modifiedRowIds = [...new Set([...areaIntersectedRowIds.value, ...rowElementIds])];

          areaIntersectedRowIds.value = modifiedRowIds;
        }
      });
    },
    [areaIntersectedRowIds, coordinate$, inside$.value]
  );

  const onMouseMove = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!dragAreaSelection) return;

    e.preventDefault();

    move$(e);
  };

  const up$ = useCallback(() => {
    const data = areaIntersectedRowIds.peek();

    const areaIntersectedRows = datasource$.value.filter((row) => data.some((id) => rowIdentifier(row) === id));

    selectedRows$.value = areaIntersectedRows;

    if (onSelectRows) onSelectRows(selectedRows$.value);

    coordinate$.value = null;
  }, [areaIntersectedRowIds, coordinate$, datasource$.value, onSelectRows, rowIdentifier]);

  const onMouseUp = (e: React.MouseEvent<HTMLTableElement>) => {
    if (!dragAreaSelection) return;

    e.preventDefault();

    up$();
  };

  useSignalEffect(() => {
    if (!coordinate$.value || !dragAreaSelection) return;

    const handleUp = (e: MouseEvent) => {
      e.preventDefault();

      up$();
    };

    const handleMove = (e: MouseEvent) => {
      e.preventDefault();

      move$(e);
    };

    window.addEventListener("mouseup", handleUp, false);
    window.addEventListener("mousemove", handleMove, false);

    return () => {
      window.removeEventListener("mouseup", handleUp, false);
      window.removeEventListener("mousemove", handleMove, false);
    };
  });

  const onGrabResizingHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>, trackId: string, width: number) => {
    e.preventDefault();

    resizerState$.value = {
      state: {
        ...resizerState$.value.state,
        [trackId]: {
          position: e.clientX,
          width: resizerState$.value.state[trackId] ? resizerState$.value.state[trackId].width || width : width,
        },
      },
      trackId,
    };
  };

  const onReleaseResizingHandler = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();

    resizerState$.value = { ...resizerState$.value, trackId: null };
  };

  useSignalEffect(() => {
    const handleResizing = (e: MouseEvent) => {
      e.preventDefault();

      if (resizerState$.value.trackId) {
        const trackId = resizerState$.value.trackId;

        const trackingState = resizerState$.value.state[trackId];

        if (trackingState) {
          const replacement = e.clientX - trackingState.position;

          const modifiedWidth = trackingState.width + replacement;

          resizerState$.value = {
            ...resizerState$.value,
            state: { ...resizerState$.value.state, [trackId]: { position: e.clientX, width: modifiedWidth } },
          };
        }
      }
    };

    const handleRelease = (e: MouseEvent) => {
      e.preventDefault();

      resizerState$.value = { ...resizerState$.value, trackId: null };
    };

    window.addEventListener("mousemove", handleResizing);
    window.addEventListener("mouseup", handleRelease);

    return () => {
      window.removeEventListener("mousemove", handleResizing);
      window.removeEventListener("mouseup", handleRelease);
    };
  });

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      {coordinate$.value && dragAreaSelection && (
        <div
          style={{
            position: "fixed",
            zIndex: 999,
            background: "#0000ff43",
            border: "1px solid blue",
            cursor: "default",
            pointerEvents: "none",
            left: coordinate$.value.endX < coordinate$.value.startX ? coordinate$.value.endX : coordinate$.value.startX,
            top: coordinate$.value.endY < coordinate$.value.startY ? coordinate$.value.endY : coordinate$.value.startY,
            width: Math.abs(coordinate$.value.endX - coordinate$.value.startX),
            height: Math.abs(coordinate$.value.endY - coordinate$.value.startY),
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
                    selectedRows$.value = e.target.checked ? datasource$.value : [];
                  }}
                  checked={selectedRows$.value.length === datasource$.value.length}
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
                      (resizerState$.value.state[resizerTrackId<T>(dataIndex, index)]
                        ? resizerState$.value.state[resizerTrackId<T>(dataIndex, index)].width || width
                        : width) + "px",
                  }}
                >
                  <div
                    className="column-resize-handler"
                    onMouseDown={(e) => {
                      onGrabResizingHandler(e, resizerTrackId<T>(dataIndex, index), width);
                    }}
                    onMouseUp={onReleaseResizingHandler}
                  />
                  {title}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <TavoloContext.Provider value={{ columnProps, rowIdentifier }}>
            <SortableContext items={sortableData$.value} strategy={verticalListSortingStrategy}>
              {renderTable()}
            </SortableContext>
          </TavoloContext.Provider>
        </tbody>
      </table>
    </DndContext>
  );
};

Tavolo.Column = Column$;
Tavolo.useSelection = useSelection$;

export default Tavolo;
