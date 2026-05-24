"use client";

import { useCallback, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { PIPELINE_COLUMNS, columnIdToDbStage, dbStageToColumnId, type PipelineColumnId } from "@/lib/pipeline-stages";

export type DealCard = {
  id: string;
  stage: string;
  monthly_fee: number | null;
  setup_fee: number | null;
  businesses: { name: string } | null;
};

function DealDraggable({ deal }: { deal: DealCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal },
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const value = Number(deal.monthly_fee ?? 0) + Number(deal.setup_fee ?? 0);
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab rounded-lg border border-neutral-200 bg-white p-3 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-70 ring-2 ring-blue-500",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex gap-2">
        <span className="mt-1 h-6 w-1 shrink-0 rounded-full bg-neutral-300" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-neutral-900">{deal.businesses?.name ?? "Business"}</p>
          <p className="mt-1 text-sm text-neutral-500">${value.toLocaleString()} value</p>
          <p className="mt-2 text-xs text-neutral-400">Drag to change stage</p>
        </div>
      </div>
    </div>
  );
}

function ColumnDrop({ columnId, title, headerClass, children }: { columnId: PipelineColumnId; title: string; headerClass: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <div className="flex min-w-[260px] max-w-[280px] shrink-0 flex-col rounded-lg border border-neutral-200 bg-white">
      <div className={cn("rounded-t-lg px-3 py-2 text-sm font-semibold", headerClass)}>{title}</div>
      <div ref={setNodeRef} className={cn("flex flex-1 flex-col gap-2 p-2", isOver && "bg-neutral-50")}>
        {children}
      </div>
    </div>
  );
}

export function PipelineKanban({ initialDeals }: { initialDeals: DealCard[] }) {
  const [deals, setDeals] = useState(initialDeals);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const byColumn = useMemo(() => {
    const map = new Map<PipelineColumnId, DealCard[]>();
    for (const c of PIPELINE_COLUMNS) map.set(c.id, []);
    for (const d of deals) {
      const col = dbStageToColumnId(d.stage);
      map.get(col)?.push(d);
    }
    return map;
  }, [deals]);

  const onDragEnd = useCallback(async (e: DragEndEvent) => {
    const deal = e.active.data.current?.deal as DealCard | undefined;
    const overId = e.over?.id as PipelineColumnId | undefined;
    if (!deal || !overId || !PIPELINE_COLUMNS.some((c) => c.id === overId)) return;
    const nextStage = columnIdToDbStage(overId);
    if (deal.stage === nextStage) return;
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: nextStage } : d)));
    const res = await fetch(`/api/deals/${deal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: nextStage }),
    });
    if (!res.ok) {
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: deal.stage } : d)));
    }
  }, []);

  const total = deals.length;
  const totalValue = deals.reduce((s, d) => s + Number(d.monthly_fee ?? 0) + Number(d.setup_fee ?? 0), 0);
  const won = deals.filter((d) => d.stage === "closed_won").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <div>
          <span className="text-neutral-500">Total deals</span>
          <p className="text-lg font-semibold text-neutral-900">{total}</p>
        </div>
        <div>
          <span className="text-neutral-500">Total value</span>
          <p className="text-lg font-semibold text-neutral-900">${totalValue.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-neutral-500">Closed won</span>
          <p className="text-lg font-semibold text-neutral-900">{won}</p>
        </div>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <ColumnDrop key={col.id} columnId={col.id} title={col.title} headerClass={col.headerClass}>
              {(byColumn.get(col.id) ?? []).map((deal) => (
                <DealDraggable key={deal.id} deal={deal} />
              ))}
            </ColumnDrop>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
