"use client";

import { useEffect, useId, useRef, useState } from "react";

const baseInput =
  "min-h-[48px] px-4 rounded-sm border border-ink-600 bg-ink-900 text-paper placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-orange-500";

function isoToGerman(iso: string): { date: string; time: string } {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
  if (!m) return { date: "", time: "" };
  return { date: `${m[3]}.${m[2]}.${m[1]}`, time: m[4] && m[5] ? `${m[4]}:${m[5]}` : "" };
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function formatTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function parseDate(text: string): string | null {
  const m = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseTime(text: string): string | null {
  const m = text.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [h, mi] = [Number(m[1]), Number(m[2])];
  if (h > 23 || mi > 59) return null;
  return `${m[1]}:${m[2]}`;
}

// Datum (TT.MM.JJJJ) und optional Uhrzeit (HH:MM, 24 h) im deutschen Format.
// Schreibt den Wert als "YYYY-MM-DD" bzw. "YYYY-MM-DDTHH:mm" in ein verstecktes
// Feld (name) und/oder meldet ihn per onValueChange.
export function GermanDateTimeField({
  name,
  id,
  defaultValue = "",
  withTime = true,
  onValueChange,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  withTime?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const fallbackId = useId();
  const baseId = id ?? fallbackId;
  const initial = isoToGerman(defaultValue);
  const [dateText, setDateText] = useState(initial.date);
  const [timeText, setTimeText] = useState(initial.time);
  const [touched, setTouched] = useState(false);
  const dateRef = useRef<HTMLInputElement>(null);
  const timeRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const dateIso = parseDate(dateText);
  const timeIso = parseTime(timeText);
  const empty = dateText === "" && (!withTime || timeText === "");

  let value = "";
  if (dateIso && (!withTime || timeIso)) value = withTime ? `${dateIso}T${timeIso}` : dateIso;

  let dateError = "";
  let timeError = "";
  if (!empty) {
    if (!dateIso) dateError = "Bitte ein gültiges Datum im Format TT.MM.JJJJ eingeben.";
    if (withTime && !timeIso) timeError = "Bitte eine Uhrzeit im Format HH:MM (24 Stunden) eingeben.";
  }

  useEffect(() => {
    dateRef.current?.setCustomValidity(dateError);
    timeRef.current?.setCustomValidity(timeError);
  }, [dateError, timeError]);

  useEffect(() => {
    onValueChange?.(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            ref={dateRef}
            id={baseId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="TT.MM.JJJJ"
            value={dateText}
            onChange={(e) => setDateText(formatDateInput(e.target.value))}
            onBlur={() => setTouched(true)}
            className={`${baseInput} w-full pr-11`}
          />
          <button
            type="button"
            onClick={() => pickerRef.current?.showPicker?.()}
            aria-label="Kalender öffnen"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 rounded-sm text-ink-300 hover:text-paper flex items-center justify-center"
          >
            <span aria-hidden>📅</span>
          </button>
          <input
            ref={pickerRef}
            type="date"
            tabIndex={-1}
            aria-hidden
            className="absolute right-0 bottom-0 h-0 w-0 opacity-0 pointer-events-none"
            value={dateIso ?? ""}
            onChange={(e) => {
              const { date } = isoToGerman(e.target.value);
              if (date) setDateText(date);
            }}
          />
        </div>
        {withTime && (
          <input
            ref={timeRef}
            id={`${baseId}-time`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="HH:MM"
            aria-label="Uhrzeit (24 Stunden)"
            value={timeText}
            onChange={(e) => setTimeText(formatTimeInput(e.target.value))}
            onBlur={() => setTouched(true)}
            className={`${baseInput} w-28 flex-none text-center`}
          />
        )}
      </div>
      {touched && (dateError || timeError) && (
        <p className="mt-1 text-xs text-red-400">{dateError || timeError}</p>
      )}
    </div>
  );
}
