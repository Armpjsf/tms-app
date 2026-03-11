"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Job } from "@/lib/supabase/jobs"
import { Driver } from "@/lib/supabase/drivers"
import { Vehicle } from "@/lib/supabase/vehicles"
import { Customer } from "@/lib/supabase/customers"
import { Route } from "@/lib/supabase/routes"
import { Subcontractor } from "@/types/subcontractor"
import { Badge } from "@/components/ui/badge"
import { PremiumCard } from "@/components/ui/premium-card"
import {
  MapPin,
  Calendar,
  Truck,
  Package,
  MoreVertical,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { updateJob } from "@/app/planning/actions"
import { toast } from "sonner"
import { JobDialog } from "./job-dialog"

interface KanbanBoardProps {
  jobs: Job[]
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  subcontractors: Subcontractor[]
  canViewPrice: boolean
  canDelete: boolean
}

type ColumnId = "New" | "Assigned" | "In Transit" | "Delivered" | "Completed"

interface Column {
  id: ColumnId
  title: string
  statuses: string[]
  color: string
}

const COLUMNS: Column[] = [
  { id: "New", title: "งานใหม่", statuses: ["New", "Pending"], color: "emerald" },
  { id: "Assigned", title: "มอบหมายแล้ว", statuses: ["Assigned", "Confirmed"], color: "blue" },
  { id: "In Transit", title: "กำลังขนส่ง", statuses: ["In Progress", "In Transit", "Accepted", "Arrived Pickup", "Arrived Dropoff"], color: "amber" },
  { id: "Delivered", title: "ส่งสินค้าแล้ว", statuses: ["Delivered"], color: "teal" },
  { id: "Completed", title: "ปิดงานแล้ว", statuses: ["Completed"], color: "gray" },
]

export function KanbanBoard({
  jobs: initialJobs,
  drivers,
  vehicles,
  customers,
  routes,
  subcontractors,
  canViewPrice,
  canDelete
}: KanbanBoardProps) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const jobsByColumn = useMemo(() => {
    const acc: Record<ColumnId, Job[]> = {
      New: [],
      Assigned: [],
      "In Transit": [],
      Delivered: [],
      Completed: [],
    }

    jobs.forEach((job) => {
      const col = COLUMNS.find((c) => c.statuses.includes(job.Job_Status || "New")) || COLUMNS[0]
      acc[col.id].push(job)
    })

    return acc
  }, [jobs])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeJobId = active.id as string
    const overId = over.id as string

    // Find the active job
    const activeJob = jobs.find((j) => j.Job_ID === activeJobId)
    if (!activeJob) return

    // If dropped over a column or a card in a column
    let newStatus: string | null = null
    
    // If overId is a column ID
    if (COLUMNS.some(c => c.id === overId)) {
        newStatus = COLUMNS.find(c => c.id === overId)!.statuses[0]
    } else {
        // If overId is a job ID
        const overJob = jobs.find(j => j.Job_ID === overId)
        if (overJob) {
            newStatus = overJob.Job_Status || "New"
        }
    }

    if (newStatus && newStatus !== activeJob.Job_Status) {
        // Optimistic UI update
        const updatedJobs = jobs.map(j => 
            j.Job_ID === activeJobId ? { ...j, Job_Status: newStatus } : j
        )
        setJobs(updatedJobs)

        // Backend update
        const res = await updateJob(activeJobId, { Job_Status: newStatus })
        if (res.success) {
            toast.success(`อัปเดตสถานะงาน ${activeJobId} เป็น ${newStatus}`)
        } else {
            toast.error("ไม่สามารถอัปเดตสถานะได้")
            setJobs(initialJobs) // Rollback
        }
    }
  }

  const activeJob = activeId ? jobs.find(j => j.Job_ID === activeId) : null

  return (
    <div className="flex gap-6 h-[calc(100vh-350px)] overflow-x-auto pb-4 custom-scrollbar">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map((column) => (
          <KanbanColumn 
            key={column.id} 
            column={column} 
            jobs={jobsByColumn[column.id]}
            drivers={drivers}
            vehicles={vehicles}
            customers={customers}
            routes={routes}
            subcontractors={subcontractors}
            canViewPrice={canViewPrice}
            canDelete={canDelete}
          />
        ))}

        <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
                styles: {
                    active: {
                        opacity: '0.5',
                    },
                },
            }),
        }}>
          {activeJob ? (
            <div className="w-[300px]">
                <KanbanCard 
                    job={activeJob} 
                    isDragging 
                    drivers={drivers}
                    vehicles={vehicles}
                    customers={customers}
                    routes={routes}
                    subcontractors={subcontractors}
                    canViewPrice={canViewPrice}
                    canDelete={canDelete}
                />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

interface KanbanColumnProps {
  column: Column
  jobs: Job[]
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  subcontractors: Subcontractor[]
  canViewPrice: boolean
  canDelete: boolean
}

function KanbanColumn({ 
    column, 
    jobs,
    drivers,
    vehicles,
    customers,
    routes,
    subcontractors,
    canViewPrice,
    canDelete
}: KanbanColumnProps) {
  const { setNodeRef } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    },
  })

  return (
    <div 
      ref={setNodeRef}
      className="flex flex-col w-[350px] min-w-[350px] bg-gray-50/50 rounded-[2rem] border border-gray-100 p-4"
    >
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full shadow-lg",
            column.color === 'emerald' ? "bg-emerald-500 shadow-emerald-500/20" :
            column.color === 'blue' ? "bg-blue-500 shadow-blue-500/20" :
            column.color === 'amber' ? "bg-amber-500 shadow-amber-500/20" :
            column.color === 'teal' ? "bg-teal-500 shadow-teal-500/20" : "bg-gray-400"
          )} />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">{column.title}</h3>
          <Badge variant="secondary" className="rounded-lg bg-white border-gray-100 text-gray-500 font-bold">
            {jobs.length}
          </Badge>
        </div>
        <button className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
            <MoreVertical size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
        <SortableContext items={jobs.map(j => j.Job_ID)} strategy={verticalListSortingStrategy}>
          {jobs.map((job) => (
            <KanbanCard 
                key={job.Job_ID} 
                job={job} 
                drivers={drivers}
                vehicles={vehicles}
                customers={customers}
                routes={routes}
                subcontractors={subcontractors}
                canViewPrice={canViewPrice}
                canDelete={canDelete}
            />
          ))}
        </SortableContext>
        
        {jobs.length === 0 && (
            <div className="h-24 border-2 border-dashed border-gray-100 rounded-[1.5rem] flex items-center justify-center text-gray-300 text-xs font-bold uppercase tracking-widest">
                Drop work here
            </div>
        )}
      </div>
    </div>
  )
}

interface KanbanCardProps {
  job: Job
  isDragging?: boolean
  drivers: Driver[]
  vehicles: Vehicle[]
  customers: Customer[]
  routes: Route[]
  subcontractors: Subcontractor[]
  canViewPrice: boolean
  canDelete: boolean
}

function KanbanCard({ 
    job, 
    isDragging,
    drivers,
    vehicles,
    customers,
    routes,
    subcontractors,
    canViewPrice,
    canDelete
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: job.Job_ID,
    data: {
      type: "Job",
      job,
    },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  if (isDragging) {
    return (
        <div 
            ref={setNodeRef}
            style={style}
            className="opacity-50 cursor-grabbing"
        >
            <JobCard job={job} />
        </div>
    )
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing group"
    >
        <JobDialog 
            mode="edit"
            job={job}
            drivers={drivers}
            vehicles={vehicles}
            customers={customers}
            routes={routes}
            subcontractors={subcontractors}
            canViewPrice={canViewPrice}
            canDelete={canDelete}
            trigger={
                <div>
                     <JobCard job={job} />
                </div>
            }
        />
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
    return (
        <PremiumCard className="p-5 hover:border-emerald-500/30 transition-all border-gray-100 shadow-sm hover:shadow-md group-hover:scale-[1.02]">
            <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    #{job.Job_ID.slice(-4)}
                </span>
                <Badge className={cn(
                    "border-0 text-[9px] font-black",
                    job.Job_Status === 'New' ? "bg-emerald-500/10 text-emerald-600" :
                    job.Job_Status === 'In Progress' ? "bg-amber-500/10 text-amber-600" :
                    job.Job_Status === 'Completed' ? "bg-teal-500/10 text-teal-600" : "bg-gray-100 text-gray-500"
                )}>
                    {job.Job_Status}
                </Badge>
            </div>

            <h4 className="text-sm font-black text-gray-900 mb-3 line-clamp-1 group-hover:text-emerald-600 transition-colors">
                {job.Customer_Name || 'ลูกค้าไม่ระบุ'}
            </h4>

            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                    <MapPin size={12} className="text-gray-400" />
                    <span className="truncate">{job.Dest_Location || 'ยังไม่กำหนดจุดส่ง'}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                    <Truck size={12} className="text-gray-400" />
                    <span>{job.Vehicle_Plate || '-'}</span>
                    <span className="mx-1 opacity-30">|</span>
                    <User size={12} className="text-gray-400" />
                    <span className="truncate">{job.Driver_Name || 'ยังไม่มอบหมาย'}</span>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                    <Calendar size={12} />
                    {job.Plan_Date || '-'}
                </div>
                {job.Weight_Kg && job.Weight_Kg > 0 ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-lg">
                        <Package size={10} className="text-gray-400" />
                        <span className="text-[9px] font-black text-gray-600">{job.Weight_Kg} KG</span>
                    </div>
                ) : null}
            </div>
        </PremiumCard>
    )
}
