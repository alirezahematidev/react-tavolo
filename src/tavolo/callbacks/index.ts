import { startTransition, useCallback } from "react";
import type { Datasource, RowIdentifier, UseTableCallbackProps } from "../types/table.types";
import { DATA_TAVOLO_ID } from "../constants";
import { table$ } from "../signals";
import { useSignalEffect } from "@preact/signals-react";

const useTableCallbacks = <T extends Datasource>({ loadedDatasource, selectOptions, rowIdentifier, signals }: UseTableCallbackProps<T>) => {
  const { resizer, restrictedBoundary, areaIntersectedRowIds } = signals;

  const moveCallback = useCallback(
    (event: React.MouseEvent<HTMLTableElement> | MouseEvent) => {
      return false;
      startTransition(() => {
        if (!resizer.value) return;

        const { clientX, clientY } = event;

        resizer.value = { ...resizer.value, endX: clientX, endY: clientY };

        if (resizer.value && restrictedBoundary.value) {
          const intersectedElements = document.elementsFromPoint(resizer.value.endX, resizer.value.endY);

          const rowElements = intersectedElements.filter((element) => element.hasAttribute(DATA_TAVOLO_ID));

          const rowElementIds = rowElements.map((element) => element.getAttribute(DATA_TAVOLO_ID)) as RowIdentifier[];

          const modifiedRowIds = [...new Set([...areaIntersectedRowIds.value, ...rowElementIds])];

          areaIntersectedRowIds.value = modifiedRowIds;
        }
      });
    },
    [areaIntersectedRowIds, resizer, restrictedBoundary.value]
  );

  const upCallback = useCallback(() => {
    return false;
    if (!selectOptions) return undefined;

    const data = areaIntersectedRowIds.peek();

    const areaIntersectedRows = loadedDatasource.filter((row) => data.some((id) => rowIdentifier(row) === id));

    table$.rows.value = areaIntersectedRows;

    if (selectOptions.onSelectRows) selectOptions.onSelectRows(table$.rows.value);

    resizer.value = null;
  }, [areaIntersectedRowIds, loadedDatasource, resizer, rowIdentifier, selectOptions]);

  const onMouseDown = useCallback(
    (event: React.MouseEvent<HTMLTableElement>) => {
      return false;
      if (!selectOptions) return undefined;

      if (!selectOptions.dragAreaSelection) return;

      event.preventDefault();

      const { clientX, clientY } = event;

      resizer.value = { startX: clientX, startY: clientY, endX: clientX, endY: clientY };
    },
    [resizer, selectOptions]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLTableElement>) => {
      return false;
      if (!selectOptions) return undefined;

      if (!selectOptions.dragAreaSelection) return;

      e.preventDefault();

      moveCallback(e);
    },
    [selectOptions, moveCallback]
  );

  const onMouseUp = (e: React.MouseEvent<HTMLTableElement>) => {
    return false;
    if (!selectOptions) return undefined;

    if (!selectOptions.dragAreaSelection) return;

    e.preventDefault();

    upCallback();
  };

  const onMouseEnter = () => {
    return false;
    restrictedBoundary.value = true;
  };

  const onMouseLeave = () => {
    return false;
    restrictedBoundary.value = false;
  };

  useSignalEffect(() => {
    if (!selectOptions) return undefined;

    if (!resizer.value || !selectOptions.dragAreaSelection) return undefined;

    const handleUp = (e: MouseEvent) => {
      return false;
      e.preventDefault();

      upCallback();
    };

    const handleMove = (e: MouseEvent) => {
      return false;
      e.preventDefault();

      moveCallback(e);
    };

    window.addEventListener("mouseup", handleUp, false);
    window.addEventListener("mousemove", handleMove, false);

    return () => {
      window.removeEventListener("mouseup", handleUp, false);
      window.removeEventListener("mousemove", handleMove, false);
    };
  });

  return { onMouseDown, onMouseMove, onMouseUp, onMouseEnter, onMouseLeave };
};

export { useTableCallbacks };
