<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #1a1a1a; margin: 0; padding: 0; }
  .page { padding: 24px 30px; }
  .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 14px; }
  .school-name { font-size: 14px; font-weight: bold; color: #1e3a8a; margin: 0; }
  .report-title { font-size: 18px; font-weight: bold; margin: 4px 0 2px; }
  .meta { font-size: 8px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #dbeafe; color: #1e3a8a; font-size: 9px; text-transform: uppercase; padding: 5px 6px; text-align: left; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5e7eb; font-size: 9px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .summary-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; }
  .summary-box h3 { font-size: 9px; color: #0369a1; text-transform: uppercase; margin: 0 0 6px; }
  .summary-grid { display: flex; gap: 20px; flex-wrap: wrap; }
  .summary-item strong { display: block; font-size: 14px; color: #1e3a8a; }
  .summary-item span { font-size: 8px; color: #6b7280; }
  .badge { padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: bold; display: inline-block; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef9c3; color: #92400e; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .footer { border-top: 1px solid #e5e7eb; margin-top: 16px; padding-top: 6px; font-size: 7px; color: #9ca3af; text-align: center; }
  .page-break { page-break-after: always; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    @if($school && $school->logo)
      <img src="{{ public_path('storage/' . $school->logo) }}" style="height:40px;float:left;margin-right:10px;" alt="Logo">
    @endif
    <p class="school-name">{{ $school?->schoolName ?? config('school.name') }}</p>
    <div style="clear:both;"></div>
    <div class="report-title">{{ $reportTitle }}</div>
    @if(!empty($filters))
      <div class="meta">
        @foreach($filters as $label => $value)
          <strong>{{ $label }}:</strong> {{ $value }} &nbsp;
        @endforeach
      </div>
    @endif
    <div class="meta">Generated: {{ now()->format('F d, Y h:i A') }}</div>
  </div>
