"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Exercise } from "@/lib/types";

type Props = {
  topic: string;
  topicLongName: string;
  department: string;
  currentExercise: Exercise;
  totalExercises: number;
};

export default function LessonPanel({
  topic,
  topicLongName,
  department,
  currentExercise,
  totalExercises,
}: Props) {
  const [lessonContent, setLessonContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/lesson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, topicLongName, department }),
    })
      .then((r) => r.json())
      .then((data) => {
        setLessonContent(data.content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [topic, department, topicLongName]);

  return (
    <div className="h-full overflow-y-auto bg-white border-r border-slate-200">
      <div className="p-5">
        <div className="mb-4">
          <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
            Lesson
          </div>
          <h1 className="text-xl font-bold text-slate-900">{topicLongName}</h1>
        </div>

        <div className="markdown-body text-sm text-slate-700">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
            </div>
          ) : (
            <ReactMarkdown>{lessonContent}</ReactMarkdown>
          )}
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
            Exercise {currentExercise.number} of {totalExercises}
          </div>
          <div className="text-sm font-semibold text-slate-900 mb-1">
            {currentExercise.title}
          </div>
          <p className="text-sm text-slate-700 mt-2 leading-relaxed">
            {currentExercise.scenario}
          </p>
          <p className="text-sm text-slate-900 mt-3 leading-relaxed font-medium italic">
            {currentExercise.controllerAsk}
          </p>
          <p className="mt-3 text-xs text-amber-700">
            Type your formula in the highlighted cell{" "}
            <span className="font-bold">{currentExercise.answerCell}</span> on the spreadsheet.
          </p>
        </div>
      </div>
    </div>
  );
}
