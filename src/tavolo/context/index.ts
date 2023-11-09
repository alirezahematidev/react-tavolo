import { createContext, useContext } from "react";
import type { Datasource, TableContextParams } from "../types/table.types";

const TableContext = createContext<TableContextParams>({
  columnProps: [],
  rowIdentifier: () => "",
});

const useInternalProps = <T extends Datasource>() => useContext<TableContextParams<T>>(TableContext);

export { TableContext, useInternalProps };
