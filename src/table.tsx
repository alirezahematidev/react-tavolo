import { untracked, useSignal, useSignalEffect } from "@preact/signals-react";
import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useCallback, useMemo } from "react";
import { Column$ } from "./column";
import { headerColumnKey, useChildrenParseAndValidate } from "./helpers";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import classnames from "classnames";
import type {
  Coordinate,
  Datasource,
  RowIdentifier,
  TableProps,
  UsePaginationReturn,
  UseSelectionReturn,
} from "./tavolo/types/table.types";
import { InternalProvider } from "./tavolo/context/provider";
import { table$ } from "./tavolo/signals";
import { PAGE_SIZE } from "./tavolo/constants";
import { useTableCallbacks } from "./tavolo/callbacks";
import { Row$ } from "./tavolo/components/row";

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
        const { slice, pageSize = PAGE_SIZE } = pagination;

        if (slice) data$.value = slicedData(data, pageSize);
      }
    }
  });

  const loadedDatasource = useMemo(() => {
    const { pagination } = props;

    if (!pagination) return data;

    if (typeof pagination === "boolean") return data$.value;

    if (pagination.slice) return data$.value;

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

          // if (!expandOptions) return undefined;

          if (expandedRecords.value.some(isMatched(expandedRow))) {
            expandedRecords.value = expandedRecords.value.filter(isDismatched(row));
          } else {
            expandedRecords.value = [...expandedRecords.peek(), row];
          }

          if (expandOptions?.onExpand) expandOptions.onExpand(expandedRecords.value);
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
      <div style={{ overflowX: "auto" }} className="table-container">
        <table
          {...listeners}
          style={{
            borderCollapse: "collapse",
            width: "100%",
            borderSpacing: 0,
            background: "#fff",
          }}
        >
          <thead style={{ background: "#f2f2f2" }}>
            <tr>
              <th style={{ width: 34 }}>
                <div style={{ padding: 10, display: "flex", justifyContent: "center", alignItems: "center" }}>
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
              {true && (
                <th style={{ width: 34 }}>
                  <div style={{ width: 30, padding: 8 }}></div>
                </th>
              )}
              {(columnProps || []).map(({ dataIndex, width, fixed, align = "center", title }, index) => (
                <th
                  key={headerColumnKey(dataIndex, index)}
                  className={classnames("header-td-cell", fixed && "fixed-column")}
                  style={{ "--column-width": width + "px" }}
                >
                  <div className={classnames("header-cell", alignClasses[align])} style={{ "--column-width": width + "px" }}>
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
          {props.pagination && (
            <tfoot>
              <tr>
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
          )}
        </table>
      </div>
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
