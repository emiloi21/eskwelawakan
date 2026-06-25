<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
<title>Form 137 — Permanent Record</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: DejaVu Sans, Arial, sans-serif;
    font-size: 8.5pt;
    color: #111;
    background: #fff;
  }

  /* ── Header ─────────────────────────────────────────────────────── */
  .school-header {
    text-align: center;
    border-bottom: 2px solid #166534;
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .depedline  { font-size: 7pt; color: #555; letter-spacing: 0.5px; }
  .school-name { font-size: 13pt; font-weight: bold; color: #166534; margin-top: 2px; }
  .school-sub  { font-size: 7.5pt; color: #555; margin-top: 2px; }
  .form-title  {
    font-size: 11pt; font-weight: bold; text-transform: uppercase;
    letter-spacing: 1.5px; margin-top: 5px; color: #111;
  }
  .form-subtitle { font-size: 7.5pt; color: #555; margin-top: 1px; }

  /* ── Student Info ────────────────────────────────────────────────── */
  .info-outer {
    border: 1px solid #d1fae5; background: #f0fdf4;
    border-radius: 3px; padding: 7px 10px; margin-bottom: 10px;
  }
  .info-table { width: 100%; border-collapse: collapse; font-size: 8pt; }
  .info-table td { padding: 2px 5px 2px 0; vertical-align: top; }
  .il { color: #374151; width: 22%; font-weight: bold; }
  .iv { width: 28%; font-weight: 600; border-bottom: 0.5px solid #9ca3af; }

  /* ── Section Heading ─────────────────────────────────────────────── */
  .sy-block { margin-bottom: 12px; page-break-inside: avoid; }
  .sy-heading {
    font-size: 9pt; font-weight: bold; text-transform: uppercase;
    letter-spacing: 0.5px; color: #166534;
    border-bottom: 1px solid #bbf7d0; padding-bottom: 2px; margin-bottom: 5px;
  }
  .sy-meta { font-size: 7.5pt; color: #555; margin-bottom: 4px; }

  /* ── Grades Table ────────────────────────────────────────────────── */
  .grades-table {
    width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 6px;
  }
  .grades-table th {
    background: #166534; color: #fff; text-align: center;
    padding: 3px 4px; font-weight: bold;
  }
  .grades-table td   { padding: 2.5px 4px; border-bottom: 0.5px solid #e5e7eb; }
  .grades-table tbody tr:nth-child(even) td { background: #f9fafb; }
  .subject-col { width: 35%; }
  .grade-col   { width: 10%; text-align: center; }
  .remarks-col { width: 15%; text-align: center; }

  .avg-row td { font-weight: bold; background: #f0fdf4 !important; border-top: 1px solid #166534; }

  /* ── Passed / Failed badge ───────────────────────────────────────── */
  .badge-pass { color: #166534; font-weight: bold; }
  .badge-fail { color: #991b1b; font-weight: bold; }

  /* ── Footer ─────────────────────────────────────────────────────── */
  .page-footer {
    margin-top: 16px; border-top: 1px solid #d1d5db;
    padding-top: 5px; font-size: 7pt; color: #9ca3af; text-align: right;
  }
  .no-data { font-size: 8pt; color: #6b7280; font-style: italic; }
</style>
</head>
<body>

{{-- ── School Header ─────────────────────────────── --}}
<div class="school-header">
  <div class="depedline">Republic of the Philippines &bull; Department of Education</div>
  <div class="school-name">SVHS School Management System</div>
  <div class="school-sub">Student Academic Record</div>
  <div class="form-title">Form 137 — Permanent Record</div>
  <div class="form-subtitle">Cumulative academic history across all enrolled school years</div>
</div>

{{-- ── Student Information ────────────────────────── --}}
<div class="info-outer">
  <table class="info-table">
    <tr>
      <td class="il">Student Name:</td>
      <td class="iv">{{ $student->lname }}, {{ $student->fname }} {{ $student->mname }}{{ $student->suffix && $student->suffix !== '-' ? ' '.$student->suffix : '' }}</td>
      <td class="il">Student ID:</td>
      <td class="iv">{{ $student->student_id }}</td>
    </tr>
    <tr>
      <td class="il">LRN:</td>
      <td class="iv">{{ $student->lrn ?? '—' }}</td>
      <td class="il">Sex:</td>
      <td class="iv">{{ $student->sex }}</td>
    </tr>
    <tr>
      <td class="il">Date of Birth:</td>
      <td class="iv">{{ $student->bdMM }}/{{ $student->bdDD }}/{{ $student->bdYYYY }}</td>
      <td class="il">Current Grade:</td>
      <td class="iv">{{ $student->gradeLevel }} — {{ $student->dept }}</td>
    </tr>
    <tr>
      <td class="il">Address:</td>
      <td class="iv" colspan="3">
        {{ implode(', ', array_filter([$student->address_street, $student->address_brgy, $student->address_city_mun, $student->address_province])) }}
      </td>
    </tr>
    <tr>
      <td class="il">Guardian:</td>
      <td class="iv">{{ $student->guardian_lname }}, {{ $student->guardian_fname }}</td>
      <td class="il">Contact:</td>
      <td class="iv">{{ $student->guardian_contact }}</td>
    </tr>
  </table>
</div>

{{-- ── Academic History ────────────────────────────── --}}
@forelse($academicHistory as $year)
<div class="sy-block">
  <div class="sy-heading">
    S.Y. {{ $year['school_year'] }} &mdash; {{ $year['grade_level'] }}
    @if(!empty($year['strand']) && !in_array($year['strand'], ['N/A', '-', '']))
      ({{ $year['strand'] }}@if(!empty($year['major']) && !in_array($year['major'], ['N/A', '-', ''])) — {{ $year['major'] }}@endif)
    @endif
  </div>
  <div class="sy-meta">
    Department: {{ $year['dept'] }}
    &nbsp;&nbsp;|&nbsp;&nbsp; Section: {{ $year['section'] !== '-' ? $year['section'] : '—' }}
    &nbsp;&nbsp;|&nbsp;&nbsp; Student ID (that SY): {{ $year['student_id'] }}
  </div>

  @if(count($year['grades']) > 0)
  <table class="grades-table">
    <thead>
      <tr>
        <th class="subject-col">Subject</th>
        <th class="grade-col">Q1</th>
        <th class="grade-col">Q2</th>
        <th class="grade-col">Q3</th>
        <th class="grade-col">Q4</th>
        <th class="grade-col">Final</th>
        <th class="remarks-col">Remarks</th>
      </tr>
    </thead>
    <tbody>
      @foreach($year['grades'] as $grade)
      <tr>
        <td>{{ $grade['subject'] }}</td>
        <td class="grade-col">{{ $grade['q1'] ?? '—' }}</td>
        <td class="grade-col">{{ $grade['q2'] ?? '—' }}</td>
        <td class="grade-col">{{ $grade['q3'] ?? '—' }}</td>
        <td class="grade-col">{{ $grade['q4'] ?? '—' }}</td>
        <td class="grade-col">{{ $grade['final_grade'] ?? '—' }}</td>
        <td class="remarks-col">{{ $grade['remarks'] ?? '' }}</td>
      </tr>
      @endforeach
      <tr class="avg-row">
        <td colspan="5" style="text-align:right;padding-right:8px;">General Average:</td>
        <td class="grade-col">
          {{ $year['general_average'] !== null ? number_format($year['general_average'], 2) : '—' }}
        </td>
        <td class="remarks-col">
          @if($year['passed'] === true)
            <span class="badge-pass">PASSED</span>
          @elseif($year['passed'] === false)
            <span class="badge-fail">FAILED</span>
          @else
            —
          @endif
        </td>
      </tr>
    </tbody>
  </table>
  @else
    <p class="no-data">No grade records found for this school year.</p>
  @endif
</div>
@empty
  <p class="no-data">No academic history available.</p>
@endforelse

{{-- ── Certification Block ─────────────────────────── --}}
<div style="margin-top:18px; border:1px solid #d1d5db; padding:8px 12px; font-size:8pt;">
  <p style="margin-bottom:10px;">
    I hereby certify that this is a true and correct copy of the academic records on file.
  </p>
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="width:50%; padding-right:20px;">
        <div style="border-top:1px solid #374151; margin-top:28px; text-align:center; font-size:7.5pt;">
          Registrar's Signature over Printed Name
        </div>
      </td>
      <td style="width:50%; padding-left:20px;">
        <div style="border-top:1px solid #374151; margin-top:28px; text-align:center; font-size:7.5pt;">
          Date Issued
        </div>
      </td>
    </tr>
  </table>
</div>

<div class="page-footer">
  Generated: {{ $generatedAt }} &bull; This document is system-generated and valid only with an official dry seal.
</div>

</body>
</html>
