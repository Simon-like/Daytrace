import { useId } from "react";
import { RecordBodyClient } from "./record-body-client";
import styles from "./reader.module.css";

interface RecordBodyProps {
  readonly html: string;
}

/** Keep long-form HTML on the server; the client receives only the enhancement target ID. */
export function RecordBody({ html }: RecordBodyProps) {
  const targetId = useId();
  return (
    <>
      <div id={targetId} className={styles.body} dangerouslySetInnerHTML={{ __html: html }} />
      <RecordBodyClient targetId={targetId} />
    </>
  );
}
