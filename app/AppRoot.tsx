"use client";

import { useState } from "react";
import type { LessonConfig, DatasetRow } from "@/lib/types";
import HomePage from "@/components/HomePage";
import ScenariosPage from "@/components/ScenariosPage";
import ClientApp from "./ClientApp";
import ScenarioApp from "./ScenarioApp";
import BudgetScenarioApp from "./BudgetScenarioApp";
import SalesCommissionScenarioApp from "./SalesCommissionScenarioApp";

type Props = {
  config: LessonConfig;
  headers: string[];
  rows: DatasetRow[];
};

type View = "home" | "practice" | "scenario" | "scenarios";

export default function AppRoot({ config, headers, rows }: Props) {
  const [view, setView] = useState<View>("home");
  const [scenarioId, setScenarioId] = useState<string | null>(null);

  const goHome = () => { setView("home"); setScenarioId(null); };
  const startScenario = (id: string) => { setScenarioId(id); setView("scenario"); };

  if (view === "home") {
    return (
      <HomePage
        onStartSkill={() => setView("practice")}
        onStartScenario={startScenario}
        onShowScenarios={() => setView("scenarios")}
      />
    );
  }

  if (view === "scenarios") {
    return (
      <ScenariosPage
        onStartScenario={startScenario}
        onNavigateHome={goHome}
      />
    );
  }

  if (view === "scenario" && scenarioId === "budget") {
    return <BudgetScenarioApp onNavigateHome={goHome} />;
  }

  if (view === "scenario" && scenarioId === "sales-commission") {
    return <SalesCommissionScenarioApp onNavigateHome={goHome} />;
  }

  if (view === "scenario" && scenarioId) {
    return <ScenarioApp scenarioId={scenarioId} onNavigateHome={goHome} />;
  }

  return (
    <ClientApp
      config={config}
      headers={headers}
      rows={rows}
      onNavigateHome={goHome}
    />
  );
}
