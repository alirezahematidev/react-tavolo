import { Children, Fragment, Key, ReactElement, isValidElement, useMemo } from "react";
import { Column$, ColumnProps } from "./column";

const getChildName = <T extends object>(child: ReactElement<ColumnProps<T>>) => {
  if (typeof child.type === "string") return child.type;

  if (child.type.name) return child.type.name;

  return child.type.valueOf().toString();
};

const useChildrenParseAndValidate = <T extends object>(children: ReactElement<ColumnProps<T>>[]) => {
  if (children === null) {
    throw new Error(`tavolo table component must have valid children. Received "${children}"`);
  }

  if (!children || !children.length) {
    throw new Error(`tavolo table component must have valid children. Received "${children}"`);
  }

  children.forEach((child) => {
    if (!isValidElement(child)) {
      throw new Error(`tavolo table component don't accept text as child elements. Received: "${child}"`);
    }

    if ([Column$, Fragment].every((type) => type !== child.type)) {
      if (Fragment === child.type) return;

      const name = getChildName(child);

      throw new Error(`<${name}> cannot appear as a child of tavolo table component. use Table.Column or Fragment instead.`);
    }
  });

  return useMemo<ColumnProps<T>[]>(() => {
    const nonFragmentChildren = children.filter((child) => child.type !== Fragment);

    return Children.map(nonFragmentChildren, (child) => ({ ...child.props }));
  }, [children]);
};

const headerColumnKey = <T extends object>(id: keyof T, index: number) => {
  if (!id) return index;

  return `__header_${id.toString()}_${index}` satisfies Key;
};

const rowColumnKey = <T extends object>(id: keyof T, index: number) => {
  if (!id) return index;

  return `__row_${id.toString()}_${index}` satisfies Key;
};

const resizerTrackId = <T extends object>(dataIndex: keyof T, index: number): string => {
  return `${dataIndex.toString()}_${index}`;
};

export { useChildrenParseAndValidate, resizerTrackId, headerColumnKey, rowColumnKey };
