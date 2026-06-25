import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import api from '@/lib/api';
import type { ClassSection, PaginatedResponse } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header';
import { DataTableFilterButton, DataTableFilterSheet } from '@/components/ui/data-table-filter-sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Printer, FileText, Users, BarChart3, X, ClipboardList, Phone, CalendarDays, MoreVertical, Download } from 'lucide-react';
import { DEPARTMENTS, STUDENT_STATUSES, GRADE_LEVELS, GRADE_LEVELS_BY_DEPT, STRANDS } from '@/lib/constants';

interface RosterStudent {
  reg_id: number;
  student_id: string;
  lrn: string;
  name: string;
  sex: string;
  status: string;
  guardian_contact: string;
}

interface ClassRoster {
  class: { class_id: number; gradeLevel: string; strand: string; section: string; dept: string; adviser: string; schoolYear: string };
  students: RosterStudent[];
  total: number;
  male_count: number;
  female_count: number;
}

interface GradeLevelData {
  [gradeLevel: string]: {
    total: number;
    male: number;
    female: number;
    sections: Record<string, { total: number; male: number; female: number }>;
  };
}

interface EnrollmentSummary {
  [dept: string]: {
    total: number;
    grade_levels: Record<string, { total: number; statuses: Record<string, number> }>;
  };
}

interface ContactStudent {
  reg_id: number;
  student_id: string;
  lrn: string;
  name: string;
  sex: string;
  gradeLevel: string;
  section: string;
  guardian: string;
  guardian_contact: string;
  guardian_relation: string;
  address: string;
}

interface GradeSheetData {
  class: { class_id: number; gradeLevel: string; strand: string; section: string; dept: string; adviser: string; schoolYear: string; semester: string };
  students: { no: number; reg_id: number; student_id: string; lrn: string; name: string; sex: string }[];
  total: number;
  male_count: number;
  female_count: number;
}

interface AttendanceData {
  class: { class_id: number; gradeLevel: string; strand: string; section: string; dept: string; adviser: string; schoolYear: string };
  month: number;
  year: number;
  days_in_month: number;
  students: { no: number; reg_id: number; name: string; sex: string }[];
  total: number;
  male_count: number;
  female_count: number;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const sy = user?.selected_sy || '';
  const [filterDept, setFilterDept] = useState('');
  const [filterGradeLevel, setFilterGradeLevel] = useState('');
  const [filterStrand, setFilterStrand] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSex, setFilterSex] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<'grade-level' | 'enrollment' | 'contact' | null>(null);
  const [rosterClassId, setRosterClassId] = useState<string | null>(null);
  const [gradeSheetClassId, setGradeSheetClassId] = useState<string | null>(null);
  const [attendanceClassId, setAttendanceClassId] = useState<string | null>(null);
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());

  const gradeLevels = filterDept ? (GRADE_LEVELS_BY_DEPT[filterDept] ?? []) : GRADE_LEVELS;
  const showStrand = filterDept === 'Senior High School' || ['Grade 11', 'Grade 12'].includes(filterGradeLevel);
  const activeFilterCount = [filterDept, filterGradeLevel, filterStrand, filterStatus, filterSex].filter(Boolean).length;

  // Classes list for roster selection
  const { data: classesData } = useQuery<PaginatedResponse<ClassSection>>({
    queryKey: ['report-classes', filterDept, sy],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '200' });
      if (filterDept) params.set('dept', filterDept);
      if (sy) params.set('schoolYear', sy);
      const { data } = await api.get(`/registrar/classes?${params}`);
      return data;
    },
  });

  // Class roster
  const { data: roster, isLoading: rosterLoading } = useQuery<ClassRoster>({
    queryKey: ['class-roster', rosterClassId],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/reports/class-roster/${rosterClassId}`);
      return data.data;
    },
    enabled: !!rosterClassId,
  });

  // By grade level
  const { data: gradeLevelData, isLoading: glLoading } = useQuery<GradeLevelData>({
    queryKey: ['report-grade-level', sy, filterDept, filterGradeLevel, filterStatus, filterSex],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sy) params.set('schoolYear', sy);
      if (filterDept) params.set('dept', filterDept);
      if (filterGradeLevel) params.set('gradeLevel', filterGradeLevel);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSex) params.set('sex', filterSex);
      const { data } = await api.get(`/registrar/reports/by-grade-level?${params}`);
      return data.data;
    },
    enabled: activeReport === 'grade-level',
  });

  // Enrollment summary
  const { data: enrollmentData, isLoading: esLoading } = useQuery<{ data: EnrollmentSummary; grand_total: number }>({
    queryKey: ['report-enrollment-summary', sy, filterDept, filterGradeLevel, filterStatus, filterSex],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sy) params.set('schoolYear', sy);
      if (filterDept) params.set('dept', filterDept);
      if (filterGradeLevel) params.set('gradeLevel', filterGradeLevel);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSex) params.set('sex', filterSex);
      const { data } = await api.get(`/registrar/reports/enrollment-summary?${params}`);
      return data;
    },
    enabled: activeReport === 'enrollment',
  });

  // Contact info by grade level
  const { data: contactData, isLoading: contactLoading } = useQuery<{ data: ContactStudent[]; total: number }>({
    queryKey: ['report-contact', sy, filterDept, filterGradeLevel, filterStrand, filterStatus, filterSex],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sy) params.set('schoolYear', sy);
      if (filterDept) params.set('dept', filterDept);
      if (filterGradeLevel) params.set('gradeLevel', filterGradeLevel);
      if (filterStrand) params.set('strand', filterStrand);
      if (filterStatus) params.set('status', filterStatus);
      if (filterSex) params.set('sex', filterSex);
      const { data } = await api.get(`/registrar/reports/by-grade-level-contact?${params}`);
      return data;
    },
    enabled: activeReport === 'contact',
  });

  // Grade sheet
  const { data: gradeSheet, isLoading: gsLoading } = useQuery<GradeSheetData>({
    queryKey: ['grade-sheet', gradeSheetClassId],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/reports/grade-sheet/${gradeSheetClassId}`);
      return data.data;
    },
    enabled: !!gradeSheetClassId,
  });

  // Attendance sheet
  const { data: attendance, isLoading: attLoading } = useQuery<AttendanceData>({
    queryKey: ['attendance-sheet', attendanceClassId, attendanceMonth, attendanceYear],
    queryFn: async () => {
      const { data } = await api.get(`/registrar/reports/attendance-sheet/${attendanceClassId}?month=${attendanceMonth}&year=${attendanceYear}`);
      return data.data;
    },
    enabled: !!attendanceClassId,
  });

  const classes = classesData?.data ?? [];

  const classColumns: ColumnDef<ClassSection>[] = [
    {
      accessorKey: 'gradeLevel',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Grade Level" />,
    },
    {
      accessorKey: 'section',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Section" />,
      cell: ({ row }) => <span className="font-medium">{row.original.section}</span>,
    },
    {
      accessorKey: 'strand',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Strand" />,
      cell: ({ row }) => row.original.strand !== '-' ? row.original.strand : '—',
      enableSorting: false,
    },
    {
      accessorKey: 'dept',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Dept" />,
    },
    {
      accessorKey: 'adviser',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Adviser" />,
      cell: ({ row }) => row.original.adviser !== '-' ? row.original.adviser : '—',
    },
    {
      accessorKey: 'students_count',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Students" />,
      cell: ({ row }) => <div className="text-center tabular-nums">{row.original.students_count ?? 0}</div>,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRosterClassId(row.original.public_id)}>
                <FileText className="mr-2 h-4 w-4" /> Class Roster
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGradeSheetClassId(row.original.public_id)}>
                <ClipboardList className="mr-2 h-4 w-4" /> Grade Sheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAttendanceClassId(row.original.public_id)}>
                <CalendarDays className="mr-2 h-4 w-4" /> Attendance
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and view SIS reports{sy && ` — ${sy}`}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          const params = new URLSearchParams();
          if (filterDept) params.set('dept', filterDept);
          if (sy) params.set('schoolYear', sy);
          window.open(`${import.meta.env.VITE_API_URL || '/api'}/registrar/classes/export?${params}`, '_blank');
        }}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Report Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveReport('grade-level')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/30">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">By Grade Level</CardTitle>
              <CardDescription>Student counts per grade &amp; section</CardDescription>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveReport('enrollment')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <CardTitle className="text-base">Enrollment Summary</CardTitle>
              <CardDescription>By department, grade level, and status</CardDescription>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setActiveReport('contact')}>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
              <Phone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base">Contact Information</CardTitle>
              <CardDescription>Guardian contact details by grade</CardDescription>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-3 dark:bg-amber-900/30">
              <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Class Reports</CardTitle>
              <CardDescription>Roster, grade sheet, attendance below</CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterDept || 'all'} onValueChange={(v) => { const d = v === 'all' ? '' : (v ?? ''); setFilterDept(d); setFilterGradeLevel(''); setFilterStrand(''); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGradeLevel || 'all'} onValueChange={(v) => { setFilterGradeLevel(v === 'all' ? '' : (v ?? '')); setFilterStrand(''); }}>
          <SelectTrigger className="w-[155px]"><SelectValue placeholder="All Grades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {gradeLevels.map((gl) => <SelectItem key={gl} value={gl}>{gl}</SelectItem>)}
          </SelectContent>
        </Select>
        {showStrand && (
          <Select value={filterStrand || 'all'} onValueChange={(v) => setFilterStrand(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Strands" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Strands</SelectItem>
              {STRANDS.filter((s) => s !== 'N/A').map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : (v ?? ''))}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSex || 'all'} onValueChange={(v) => setFilterSex(v === 'all' ? '' : (v ?? ''))}>
          <SelectTrigger className="w-[110px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="Male">Male</SelectItem>
            <SelectItem value="Female">Female</SelectItem>
          </SelectContent>
        </Select>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterDept(''); setFilterGradeLevel(''); setFilterStrand(''); setFilterStatus(''); setFilterSex(''); }}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Grade Level Report */}
      {activeReport === 'grade-level' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Students by Grade Level</CardTitle>
              <CardDescription>Enrolled students grouped by grade level and section</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </CardHeader>
          <CardContent>
            {glLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : gradeLevelData && Object.keys(gradeLevelData).length ? (
              <div className="space-y-6">
                {Object.entries(gradeLevelData).map(([gl, info]) => (
                  <div key={gl}>
                    <h3 className="font-semibold mb-2">{gl}
                      <Badge variant="secondary" className="ml-2 tabular-nums">{info.total}</Badge>
                      <span className="ml-2 text-xs text-muted-foreground">M: {info.male} | F: {info.female}</span>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead className="text-center">Male</TableHead>
                          <TableHead className="text-center">Female</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(info.sections).map(([sec, data]) => (
                          <TableRow key={sec}>
                            <TableCell>{sec !== '-' ? sec : '(Unassigned)'}</TableCell>
                            <TableCell className="text-center tabular-nums">{data.male}</TableCell>
                            <TableCell className="text-center tabular-nums">{data.female}</TableCell>
                            <TableCell className="text-center tabular-nums font-medium">{data.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enrollment Summary Report */}
      {activeReport === 'enrollment' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Enrollment Summary</CardTitle>
              <CardDescription>
                Grand Total: <span className="font-semibold">{enrollmentData?.grand_total ?? 0}</span> students
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </CardHeader>
          <CardContent>
            {esLoading ? (
              <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : enrollmentData?.data && Object.keys(enrollmentData.data).length ? (
              <div className="space-y-6">
                {Object.entries(enrollmentData.data).map(([dept, info]) => (
                  <div key={dept}>
                    <h3 className="font-semibold mb-2">{dept}
                      <Badge variant="secondary" className="ml-2 tabular-nums">{info.total}</Badge>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grade Level</TableHead>
                          <TableHead className="text-center">Enrolled</TableHead>
                          <TableHead className="text-center">For Assessment</TableHead>
                          <TableHead className="text-center">For Payment</TableHead>
                          <TableHead className="text-center">Others</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(info.grade_levels).map(([gl, glData]) => (
                          <TableRow key={gl}>
                            <TableCell>{gl}</TableCell>
                            <TableCell className="text-center tabular-nums">{glData.statuses['Enrolled'] ?? 0}</TableCell>
                            <TableCell className="text-center tabular-nums">{glData.statuses['For Accounts Assessment'] ?? 0}</TableCell>
                            <TableCell className="text-center tabular-nums">{glData.statuses['For Payment'] ?? 0}</TableCell>
                            <TableCell className="text-center tabular-nums">
                              {Object.entries(glData.statuses)
                                .filter(([k]) => !['Enrolled', 'For Accounts Assessment', 'For Payment'].includes(k))
                                .reduce((sum, [, v]) => sum + v, 0)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums font-medium">{glData.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contact Information Report */}
      {activeReport === 'contact' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Total: <span className="font-semibold">{contactData?.total ?? 0}</span> students
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </CardHeader>
          <CardContent>
            {contactLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : contactData?.data?.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Relation</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactData.data.map((s, i) => (
                      <TableRow key={s.reg_id}>
                        <TableCell className="tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{s.name}</TableCell>
                        <TableCell>{s.gradeLevel}</TableCell>
                        <TableCell>{s.section}</TableCell>
                        <TableCell className="whitespace-nowrap">{s.guardian}</TableCell>
                        <TableCell className="font-mono text-xs">{s.guardian_contact}</TableCell>
                        <TableCell>{s.guardian_relation}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">{s.address}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Class List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Class Reports</CardTitle>
          <CardDescription>Select a class for roster, grade sheet, or attendance</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={classColumns}
            data={classes}
            getRowId={(row) => row.public_id}
            noResultsMessage="No classes found."
            toolbar={
              <div className="flex flex-wrap items-center gap-3">
                <DataTableFilterButton activeCount={activeFilterCount} onClick={() => setFilterOpen(true)} />
              </div>
            }
          />
        </CardContent>
      </Card>

      <DataTableFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        activeCount={activeFilterCount}
        onReset={() => { setFilterDept(''); setFilterGradeLevel(''); setFilterStrand(''); setFilterStatus(''); setFilterSex(''); }}
      >
        <div className="space-y-1">
          <Label className="text-sm font-medium">Department</Label>
          <Select value={filterDept || 'all'} onValueChange={(v) => { const d = v === 'all' ? '' : (v ?? ''); setFilterDept(d); setFilterGradeLevel(''); setFilterStrand(''); }}>
            <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Grade Level</Label>
          <Select value={filterGradeLevel || 'all'} onValueChange={(v) => { setFilterGradeLevel(v === 'all' ? '' : (v ?? '')); setFilterStrand(''); }}>
            <SelectTrigger><SelectValue placeholder="All Grade Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grade Levels</SelectItem>
              {gradeLevels.map((gl) => <SelectItem key={gl} value={gl}>{gl}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {showStrand && (
          <div className="space-y-1">
            <Label className="text-sm font-medium">Strand</Label>
            <Select value={filterStrand || 'all'} onValueChange={(v) => setFilterStrand(v === 'all' ? '' : (v ?? ''))}>
              <SelectTrigger><SelectValue placeholder="All Strands" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Strands</SelectItem>
                {STRANDS.filter((s) => s !== 'N/A').map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-sm font-medium">Status</Label>
          <Select value={filterStatus || 'all'} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STUDENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium">Sex</Label>
          <Select value={filterSex || 'all'} onValueChange={(v) => setFilterSex(v === 'all' ? '' : (v ?? ''))}>
            <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterSheet>

      {/* Class Roster Dialog */}
      <Dialog open={!!rosterClassId} onOpenChange={(open) => { if (!open) setRosterClassId(null); }}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {roster ? `${roster.class.gradeLevel} — ${roster.class.section}` : 'Class Roster'}
            </DialogTitle>
          </DialogHeader>
          {rosterLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : roster ? (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Adviser: <strong className="text-foreground">{roster.class.adviser !== '-' ? roster.class.adviser : 'N/A'}</strong></span>
                <span>Total: <strong className="text-foreground">{roster.total}</strong></span>
                <span>M: {roster.male_count}</span>
                <span>F: {roster.female_count}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.students.map((s, i) => (
                    <TableRow key={s.reg_id}>
                      <TableCell className="tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{s.student_id}</TableCell>
                      <TableCell className="font-mono text-xs">{s.lrn}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.sex}</TableCell>
                      <TableCell><Badge variant={s.status === 'Enrolled' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Grade Sheet Dialog */}
      <Dialog open={!!gradeSheetClassId} onOpenChange={(open) => { if (!open) setGradeSheetClassId(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Grade Sheet{gradeSheet ? ` — ${gradeSheet.class.gradeLevel} ${gradeSheet.class.section}` : ''}
            </DialogTitle>
          </DialogHeader>
          {gsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : gradeSheet ? (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                <span>Adviser: <strong className="text-foreground">{gradeSheet.class.adviser !== '-' ? gradeSheet.class.adviser : 'N/A'}</strong></span>
                <span>SY: <strong className="text-foreground">{gradeSheet.class.schoolYear}</strong></span>
                {gradeSheet.class.semester && <span>Sem: <strong className="text-foreground">{gradeSheet.class.semester}</strong></span>}
                <span>Total: <strong className="text-foreground">{gradeSheet.total}</strong> (M: {gradeSheet.male_count} | F: {gradeSheet.female_count})</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead className="text-center">Q1</TableHead>
                    <TableHead className="text-center">Q2</TableHead>
                    <TableHead className="text-center">Q3</TableHead>
                    <TableHead className="text-center">Q4</TableHead>
                    <TableHead className="text-center">Final</TableHead>
                    <TableHead className="text-center">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeSheet.students.map((s) => (
                    <TableRow key={s.reg_id}>
                      <TableCell className="tabular-nums">{s.no}</TableCell>
                      <TableCell className="font-mono text-xs">{s.student_id}</TableCell>
                      <TableCell className="font-mono text-xs">{s.lrn}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.sex}</TableCell>
                      <TableCell className="text-center border-l">&nbsp;</TableCell>
                      <TableCell className="text-center">&nbsp;</TableCell>
                      <TableCell className="text-center">&nbsp;</TableCell>
                      <TableCell className="text-center">&nbsp;</TableCell>
                      <TableCell className="text-center border-l">&nbsp;</TableCell>
                      <TableCell className="text-center">&nbsp;</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Attendance Sheet Dialog */}
      <Dialog open={!!attendanceClassId} onOpenChange={(open) => { if (!open) setAttendanceClassId(null); }}>
        <DialogContent className="max-w-[95vw] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Attendance Sheet{attendance ? ` — ${attendance.class.gradeLevel} ${attendance.class.section}` : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <Label>Month</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={attendanceMonth}
              onChange={(e) => setAttendanceMonth(Number(e.target.value))}
              className="w-20"
            />
            <Label>Year</Label>
            <Input
              type="number"
              min={2020}
              max={2035}
              value={attendanceYear}
              onChange={(e) => setAttendanceYear(Number(e.target.value))}
              className="w-24"
            />
          </div>
          {attLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : attendance ? (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Adviser: <strong className="text-foreground">{attendance.class.adviser !== '-' ? attendance.class.adviser : 'N/A'}</strong></span>
                <span>Total: <strong className="text-foreground">{attendance.total}</strong> (M: {attendance.male_count} | F: {attendance.female_count})</span>
              </div>
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 sticky left-0 bg-background">#</TableHead>
                      <TableHead className="min-w-[160px] sticky left-8 bg-background">Name</TableHead>
                      <TableHead className="w-8">Sex</TableHead>
                      {Array.from({ length: attendance.days_in_month }, (_, i) => (
                        <TableHead key={i} className="w-7 text-center px-0.5">{i + 1}</TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.students.map((s) => (
                      <TableRow key={s.reg_id}>
                        <TableCell className="tabular-nums sticky left-0 bg-background">{s.no}</TableCell>
                        <TableCell className="font-medium sticky left-8 bg-background whitespace-nowrap">{s.name}</TableCell>
                        <TableCell>{s.sex}</TableCell>
                        {Array.from({ length: attendance.days_in_month }, (_, i) => (
                          <TableCell key={i} className="text-center px-0.5">&nbsp;</TableCell>
                        ))}
                        <TableCell className="text-center">&nbsp;</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
