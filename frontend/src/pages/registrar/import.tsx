import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Alert, AlertDescription,
} from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Upload, Download, Loader2, FileText, CheckCircle2, XCircle, AlertTriangle, RotateCcw,
} from 'lucide-react';

interface PreviewRow {
  lrn: string;
  student_id: string;
  lname: string;
  fname: string;
  mname: string;
  suffix: string;
  sex: string;
  dept: string;
  gradeLevel: string;
  strand: string;
  major: string;
  section: string;
  classification: string;
  schoolYear: string;
  sem: string;
  status: string;
  _valid: boolean;
  _action: 'insert' | 'update';
  _line: number;
}

interface PreviewError {
  line: number;
  error: string;
}

interface PreviewResult {
  rows: PreviewRow[];
  errors: PreviewError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    inserts: number;
    updates: number;
  };
}

interface ImportResult {
  message: string;
  inserted: number;
  updated: number;
  skipped: number;
}

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/registrar/import/preview', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as PreviewResult;
    },
    onSuccess: (data) => {
      setPreview(data);
      setImportResult(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to parse CSV.');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/registrar/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data as ImportResult;
    },
    onSuccess: (data) => {
      setImportResult(data);
      toast.success(data.message);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Import failed.');
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(null);
      setImportResult(null);
      previewMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = async () => {
    const { data } = await api.get('/registrar/import/template', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">CSV Student Import</h1>
        <p className="text-muted-foreground">
          Upload a CSV file to bulk import or update student records.
        </p>
      </div>

      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            CSV with 16 columns: LRN, Student ID, Last Name, First Name, Middle Name, Suffix, Sex,
            Department, Grade Level, Strand, Major, Section, Classification, School Year, Semester, Status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            {(preview || importResult) && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Reset
              </Button>
            )}
          </div>
          {previewMutation.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing CSV…
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import result */}
      {importResult && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <strong>Import complete.</strong>{' '}
            Inserted: {importResult.inserted}, Updated: {importResult.updated}, Skipped: {importResult.skipped}
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && !importResult && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{preview.summary.total}</div>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{preview.summary.valid}</div>
                <p className="text-xs text-muted-foreground">Valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{preview.summary.invalid}</div>
                <p className="text-xs text-muted-foreground">Invalid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{preview.summary.inserts}</div>
                <p className="text-xs text-muted-foreground">New Students</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-amber-600">{preview.summary.updates}</div>
                <p className="text-xs text-muted-foreground">Updates</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {preview.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{preview.errors.length} validation error(s):</strong>
                <ul className="mt-2 ml-4 list-disc text-sm space-y-1">
                  {preview.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>Line {e.line}: {e.error}</li>
                  ))}
                  {preview.errors.length > 20 && (
                    <li>…and {preview.errors.length - 20} more.</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Preview ({preview.rows.length} rows)
              </CardTitle>
              {preview.summary.valid > 0 && (
                <Button
                  onClick={() => selectedFile && importMutation.mutate(selectedFile)}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Upload className="mr-2 h-4 w-4" />
                  Import {preview.summary.valid} Valid Row(s)
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Sex</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Grade Level</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>School Year</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i} className={!row._valid ? 'bg-destructive/5' : undefined}>
                        <TableCell className="text-muted-foreground">{row._line}</TableCell>
                        <TableCell>
                          {row._valid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.student_id}</TableCell>
                        <TableCell>{row.lname}, {row.fname} {row.mname}</TableCell>
                        <TableCell>{row.sex}</TableCell>
                        <TableCell>{row.dept}</TableCell>
                        <TableCell>{row.gradeLevel}</TableCell>
                        <TableCell>{row.section}</TableCell>
                        <TableCell>{row.schoolYear}</TableCell>
                        <TableCell>
                          <Badge variant={row._action === 'insert' ? 'default' : 'secondary'}>
                            {row._action === 'insert' ? 'New' : 'Update'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
