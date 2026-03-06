"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { CheckIn, GoalProgressSummary } from "@/components/checkins/types";
import { parseDateLocal, todayLocal } from "@/lib/date";
import {
  applyCheckInToggle,
  applyGoalProgressToggle,
  buildCalendarDays,
  buildCheckInsByDate,
  getCalendarRange,
  readJson,
  resolveErrorMessage,
} from "@/components/checkins/utils";

type UseCheckinsPageDataOptions = {
  errorMessage: string;
};

type CheckInsResponse = {
  checkIns?: CheckIn[];
};

type GoalsResponse = {
  goals?: GoalProgressSummary[];
};

function useMobileCheckIns(options: {
  errorMessage: string;
  selectedDate: string;
  setMessage: (message: string) => void;
  setMobileCheckIns: (checkIns: CheckIn[]) => void;
}) {
  const { errorMessage, selectedDate, setMessage, setMobileCheckIns } = options;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await readJson<CheckInsResponse>({
          url: `/api/checkins?date=${selectedDate}`,
        });
        if (!cancelled) setMobileCheckIns(data.checkIns || []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setMessage(resolveErrorMessage(error, errorMessage));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [errorMessage, selectedDate, setMessage, setMobileCheckIns]);
}

function useCalendarCheckIns(options: {
  displayMonth: Date;
  errorMessage: string;
  setCalendarCheckIns: (checkIns: CheckIn[]) => void;
  setMessage: (message: string) => void;
}) {
  const { displayMonth, errorMessage, setCalendarCheckIns, setMessage } = options;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { startDate, endDate } = getCalendarRange(displayMonth);
        const data = await readJson<CheckInsResponse>({
          url: `/api/checkins?startDate=${startDate}&endDate=${endDate}`,
        });
        if (!cancelled) setCalendarCheckIns(data.checkIns || []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setMessage(resolveErrorMessage(error, errorMessage));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [displayMonth, errorMessage, setCalendarCheckIns, setMessage]);
}

function useDashboardGoals(options: {
  errorMessage: string;
  setDashboardGoals: (goals: GoalProgressSummary[]) => void;
  setMessage: (message: string) => void;
}) {
  const { errorMessage, setDashboardGoals, setMessage } = options;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await readJson<GoalsResponse>({ url: "/api/goals" });
        if (!cancelled) setDashboardGoals(data.goals || []);
      } catch (error) {
        console.error(error);
        if (!cancelled) setMessage(resolveErrorMessage(error, errorMessage));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [errorMessage, setDashboardGoals, setMessage]);
}

function useCheckinToggle(options: {
  errorMessage: string;
  updatingId: string | null;
  setCalendarCheckIns: Dispatch<SetStateAction<CheckIn[]>>;
  setDashboardGoals: Dispatch<SetStateAction<GoalProgressSummary[]>>;
  setMessage: (message: string) => void;
  setMobileCheckIns: Dispatch<SetStateAction<CheckIn[]>>;
  setUpdatingId: (id: string | null) => void;
}) {
  const {
    errorMessage,
    updatingId,
    setCalendarCheckIns,
    setDashboardGoals,
    setMessage,
    setMobileCheckIns,
    setUpdatingId,
  } = options;

  return useCallback(
    async (checkIn: CheckIn) => {
      if (updatingId === checkIn.id) return;

      setMessage("");
      setUpdatingId(checkIn.id);
      const nextCompleted = !checkIn.completed;

      try {
        await readJson({
          url: `/api/checkins/${checkIn.id}`,
          init: {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: nextCompleted }),
          },
        });
        setMobileCheckIns((prev) =>
          applyCheckInToggle(prev, checkIn, nextCompleted)
        );
        setCalendarCheckIns((prev) =>
          applyCheckInToggle(prev, checkIn, nextCompleted)
        );
        setDashboardGoals((prev) =>
          applyGoalProgressToggle(prev, checkIn, nextCompleted)
        );
      } catch (error) {
        console.error(error);
        setMessage(resolveErrorMessage(error, errorMessage));
      } finally {
        setUpdatingId(null);
      }
    },
    [
      errorMessage,
      setCalendarCheckIns,
      setDashboardGoals,
      setMessage,
      setMobileCheckIns,
      setUpdatingId,
      updatingId,
    ]
  );
}

export function useCheckinsPageData({
  errorMessage,
}: UseCheckinsPageDataOptions) {
  const [selectedDate, setSelectedDate] = useState(todayLocal());
  const [displayMonth, setDisplayMonth] = useState(parseDateLocal(todayLocal()));
  const [mobileCheckIns, setMobileCheckIns] = useState<CheckIn[]>([]);
  const [calendarCheckIns, setCalendarCheckIns] = useState<CheckIn[]>([]);
  const [dashboardGoals, setDashboardGoals] = useState<GoalProgressSummary[]>([]);
  const [message, setMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const checkInsByDate = useMemo(
    () => buildCheckInsByDate(calendarCheckIns),
    [calendarCheckIns]
  );
  const calendarDays = useMemo(
    () => buildCalendarDays(checkInsByDate, displayMonth),
    [checkInsByDate, displayMonth]
  );
  const toggleCheckin = useCheckinToggle({
    errorMessage,
    updatingId,
    setCalendarCheckIns,
    setDashboardGoals,
    setMessage,
    setMobileCheckIns,
    setUpdatingId,
  });

  useMobileCheckIns({ errorMessage, selectedDate, setMessage, setMobileCheckIns });
  useCalendarCheckIns({
    displayMonth,
    errorMessage,
    setCalendarCheckIns,
    setMessage,
  });
  useDashboardGoals({ errorMessage, setDashboardGoals, setMessage });

  return {
    calendarDays,
    dashboardGoals,
    displayMonth,
    message,
    mobileCheckIns,
    selectedDate,
    setDisplayMonth,
    setSelectedDate,
    toggleCheckin,
    updatingId,
  };
}
