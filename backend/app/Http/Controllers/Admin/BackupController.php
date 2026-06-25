<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BackupController extends Controller
{
    private string $backupDir = 'backups';

    public function index(): JsonResponse
    {
        $files = Storage::disk('local')->files($this->backupDir);

        $backups = collect($files)
            ->filter(fn ($f) => str_ends_with($f, '.sql'))
            ->map(fn ($f) => [
                'name' => basename($f),
                'size' => Storage::disk('local')->size($f),
                'created_at' => date('Y-m-d H:i:s', Storage::disk('local')->lastModified($f)),
            ])
            ->sortByDesc('created_at')
            ->values();

        return response()->json(['data' => $backups]);
    }

    public function store(Request $request): JsonResponse
    {
        $dbName = config('database.connections.mysql.database');
        $timestamp = now()->format('Y-m-d_His');
        $filename = "{$dbName}_{$timestamp}.sql";
        $path = "{$this->backupDir}/{$filename}";

        Storage::disk('local')->makeDirectory($this->backupDir);

        $tables = DB::select('SHOW TABLES');
        $key = "Tables_in_{$dbName}";

        $sql = "-- Database Backup: {$dbName}\n";
        $sql .= "-- Generated: " . now()->toDateTimeString() . "\n";
        $sql .= "-- By: " . $request->user()->full_name . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $table) {
            $tableName = $table->$key;

            // Table structure
            $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
            $sql .= $createTable[0]->{'Create Table'} . ";\n\n";

            // Table data in batches
            $rows = DB::table($tableName)->get();
            if ($rows->isEmpty()) {
                continue;
            }

            $columns = array_keys((array) $rows->first());
            $colList = implode('`, `', $columns);

            foreach ($rows->chunk(100) as $chunk) {
                $values = $chunk->map(function ($row) {
                    return '(' . implode(', ', array_map(function ($val) {
                        if ($val === null) {
                            return 'NULL';
                        }
                        return DB::getPdo()->quote((string) $val);
                    }, (array) $row)) . ')';
                })->implode(",\n");

                $sql .= "INSERT INTO `{$tableName}` (`{$colList}`) VALUES\n{$values};\n\n";
            }
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";

        Storage::disk('local')->put($path, $sql);

        return response()->json([
            'message' => 'Backup created successfully',
            'data' => [
                'name' => $filename,
                'size' => Storage::disk('local')->size($path),
                'created_at' => now()->toDateTimeString(),
            ],
        ], 201);
    }

    public function download(string $name): StreamedResponse
    {
        $safeName = basename($name);
        $path = "{$this->backupDir}/{$safeName}";

        if (! Storage::disk('local')->exists($path)) {
            abort(404, 'Backup not found');
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('local');

        return $disk->download($path, $safeName, [
            'Content-Type' => 'application/sql',
        ]);
    }

    public function destroy(string $name): JsonResponse
    {
        $safeName = basename($name);
        $path = "{$this->backupDir}/{$safeName}";

        if (! Storage::disk('local')->exists($path)) {
            abort(404, 'Backup not found');
        }

        Storage::disk('local')->delete($path);

        return response()->json(['message' => 'Backup deleted']);
    }
}
