import { type ComponentProps } from "react";
import type { DateRange } from "react-day-picker";
import { format, differenceInCalendarDays } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

interface DateRangePickerProps {
  date: DateRange | undefined;
  onDateChange: (date: DateRange | undefined) => void;
  className?: string;
  id?: string;
  placeholder?: ComponentProps<typeof Button>["children"];
}

export function DateRangePicker({
  date,
  onDateChange,
  className,
  id,
  placeholder = "Pick a date",
}: DateRangePickerProps) {
  const sameDay = date?.from && date?.to && differenceInCalendarDays(date.to, date.from) === 0;
  const fullTo = date?.to && !sameDay ? format(date.to, "LLL dd, y") : undefined;
  const fromDate = date?.to ? date.from : date?.from;
  const toDate = date?.to && !sameDay ? date.to : undefined;

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              toDate ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(toDate, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>{placeholder}</span>
            )}
            {sameDay && date?.from && date?.to && (
              <span className="ml-1">({differenceInCalendarDays(date.to, date.from)} days)</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            showOutsideDays={false}
          />
        </PopoverContent>
      </Popover>
      {date?.from && date?.to && differenceInCalendarDays(date.to, date.from) !== 0 && (
        <p className="text-xs text-muted-foreground">
          {differenceInCalendarDays(date.to, date.from)} days selected
        </p>
      )}
    </div>
  );
}
