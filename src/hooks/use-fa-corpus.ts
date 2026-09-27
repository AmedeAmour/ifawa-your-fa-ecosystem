import { useEffect, useState } from "react";
import { signDocuments } from "@/data/fa-signs";
import { loadSignDocuments } from "@/lib/ifawa-fa";

export function useFaCorpus() {
  const [documents, setDocuments] = useState(signDocuments);
  useEffect(() => {
    let alive = true;
    loadSignDocuments()
      .then((items) => {
        if (alive) setDocuments(items);
      })
      .catch(() => {
        // Keep the bundled, source-verified corpus available during an outage.
      });
    return () => {
      alive = false;
    };
  }, []);
  return documents;
}
