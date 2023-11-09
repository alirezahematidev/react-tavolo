import { TableContext } from ".";
import type { Datasource, InternalProviderProps } from "../types/table.types";

const InternalProvider = <T extends Datasource>({ children, ...value }: InternalProviderProps<T>) => {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
};

export { InternalProvider };
