import { loadLessonConfig, loadDataset } from "@/lib/load-content";
import AppRoot from "./AppRoot";

export default function Home() {
  const config = loadLessonConfig();
  const { headers, rows } = loadDataset(config.datasetFile);

  return (
    <AppRoot
      config={config}
      headers={headers}
      rows={rows as any}
    />
  );
}
