import "react";

declare module "react" {
  interface CSSProperties {
    readonly "--column-width"?: string;
  }
}
