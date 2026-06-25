<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 24px 30px; }
  .header { border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px; }
  .school-name { font-size: 14px; font-weight: bold; color: #064e3b; margin: 0; }
  .report-title { font-size: 18px; font-weight: bold; margin: 4px 0 2px; }
  .meta { font-size: 8px; color: #6b7280; }
  .confidential { font-size: 9px; font-weight: bold; color: #b91c1c; margin-top: 2px; letter-spacing: 1px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #d1fae5; color: #064e3b; font-size: 9px; text-transform: uppercase; padding: 5px 6px; text-align: left; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef9c3; color: #92400e; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .badge-purple { background: #ede9fe; color: #5b21b6; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 6px; font-size: 7px; color: #9ca3af; text-align: center; }
  .page-break { page-break-after: always; }
</style>
<title>{{ $title ?? 'Guidance Office Report' }}</title>
</head>
<body>
<div class="page">
<div class="header">
  <p class="school-name">{{ config('school.name', 'School') }}</p>
  <p class="report-title">{{ $title ?? 'Guidance Office Report' }}</p>
  <p class="confidential">STRICTLY CONFIDENTIAL — GUIDANCE OFFICE USE ONLY</p>
  <p class="meta">Generated: {{ $generated }} &nbsp;|&nbsp; School Year: {{ $schoolYear ?? 'All School Years' }}</p>
</div>
