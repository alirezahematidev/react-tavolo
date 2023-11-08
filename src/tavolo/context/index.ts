import { createContext, useContext } from "react";
import { Datasource, type TableContextParams } from "../types/table.types";

const TableContext = createContext<TableContextParams>({
  columnProps: [],
  expandOptions: {},
  rowIdentifier: () => String(),
});

const useIntertalProps = <T extends Datasource>() => useContext<TableContextParams<T>>(TableContext);

export { TableContext, useIntertalProps };
