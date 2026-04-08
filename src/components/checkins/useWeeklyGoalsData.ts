"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readJson,
  resolveErrorMessage,
} from "@/components/checkins/utils";
import type {
  WeeklyGoalCurrentItem,
  WeeklyGoalsPayload,
  WeeklyGoalTemplateForm,
} from "@/lib/weekly-goal-types";

type UseWeeklyGoalsDataOptions = {
  readonly errorMessage: string;
  readonly requiredMessage: string;
  readonly successSavedMessage: string;
  readonly successUpdatedMessage: string;
  readonly successDeletedMessage: string;
};

const EMPTY_FORM: WeeklyGoalTemplateForm = {
  title: "",
  description: "",
};

export function useWeeklyGoalsData({
  errorMessage,
  requiredMessage,
  successDeletedMessage,
  successSavedMessage,
  successUpdatedMessage,
}: UseWeeklyGoalsDataOptions) {
  const [data, setData] = useState<WeeklyGoalsPayload | null>(null);
  const [form, setForm] = useState<WeeklyGoalTemplateForm>(EMPTY_FORM);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const loadWeeklyGoals = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await readJson<WeeklyGoalsPayload>({
        url: "/api/weekly-goals",
      });
      setData(payload);
    } catch (error) {
      console.error(error);
      setMessage(resolveErrorMessage(error, errorMessage));
    } finally {
      setLoading(false);
    }
  }, [errorMessage]);

  useEffect(() => {
    void loadWeeklyGoals();
  }, [loadWeeklyGoals]);

  const handleFormChange = useCallback(
    (field: keyof WeeklyGoalTemplateForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingTemplateId(null);
  }, []);

  const submitForm = useCallback(async () => {
    if (!form.title.trim()) {
      setMessage(requiredMessage);
      return;
    }

    const method = editingTemplateId ? "PATCH" : "POST";
    const url = editingTemplateId
      ? `/api/weekly-goals/templates/${editingTemplateId}`
      : "/api/weekly-goals/templates";

    setMessage("");
    setSaving(true);

    try {
      await readJson({
        url,
        init: {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      });
      resetForm();
      await loadWeeklyGoals();
      setMessage(editingTemplateId ? successUpdatedMessage : successSavedMessage);
    } catch (error) {
      console.error(error);
      setMessage(resolveErrorMessage(error, errorMessage));
    } finally {
      setSaving(false);
    }
  }, [
    editingTemplateId,
    errorMessage,
    form,
    loadWeeklyGoals,
    requiredMessage,
    resetForm,
    successSavedMessage,
    successUpdatedMessage,
  ]);

  const startEditing = useCallback((item: WeeklyGoalCurrentItem) => {
    setEditingTemplateId(item.templateId);
    setForm({
      title: item.title,
      description: item.description,
    });
    setMessage("");
  }, []);

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (deletingTemplateId === templateId) {
        return;
      }

      setMessage("");
      setDeletingTemplateId(templateId);

      try {
        await readJson({
          url: `/api/weekly-goals/templates/${templateId}`,
          init: {
            method: "DELETE",
          },
        });
        if (editingTemplateId === templateId) {
          resetForm();
        }
        await loadWeeklyGoals();
        setMessage(successDeletedMessage);
      } catch (error) {
        console.error(error);
        setMessage(resolveErrorMessage(error, errorMessage));
      } finally {
        setDeletingTemplateId(null);
      }
    },
    [
      deletingTemplateId,
      editingTemplateId,
      errorMessage,
      loadWeeklyGoals,
      resetForm,
      successDeletedMessage,
    ]
  );

  const toggleWeeklyGoal = useCallback(
    async (item: WeeklyGoalCurrentItem) => {
      if (togglingId === item.id) {
        return;
      }

      setMessage("");
      setTogglingId(item.id);

      try {
        await readJson({
          url: `/api/weekly-goals/instances/${item.id}`,
          init: {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: !item.completed }),
          },
        });
        await loadWeeklyGoals();
      } catch (error) {
        console.error(error);
        setMessage(resolveErrorMessage(error, errorMessage));
      } finally {
        setTogglingId(null);
      }
    },
    [errorMessage, loadWeeklyGoals, togglingId]
  );

  return {
    data,
    deleteTemplate,
    deletingTemplateId,
    editingTemplateId,
    form,
    handleFormChange,
    loading,
    message,
    resetForm,
    saving,
    startEditing,
    submitForm,
    toggleWeeklyGoal,
    togglingId,
  };
}
